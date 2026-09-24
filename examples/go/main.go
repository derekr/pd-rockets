package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"html/template"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"sync"
)

type Card struct {
	ID    string `json:"id"`
	Title string `json:"title"`
}

type Column struct {
	ID    int    `json:"id"`
	Label string `json:"label"`
	Cards []Card `json:"cards"`
}

type Item struct {
	ID    string `json:"id"`
	Label string `json:"label"`
}

type DemoModel struct {
	Columns []Column `json:"columns"`
	List    []Item   `json:"list"`
}

var (
	modelMu sync.Mutex
	model   DemoModel

	pageTemplate = template.Must(template.New("page").Parse(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Rocket kit spike</title>
    <link rel="stylesheet" href="/demo.css">
  </head>
  <body data-signals='{"cardId":"","col":0,"before":"","itemId":""}'>
    <h1>Rocket kit spike</h1>
    <p>Drag cards, use the Kanban keyboard defaults, or reorder the list.</p>
    {{template "demo" .}}
    <script type="module" src="/rocket-kit.js"></script>
  </body>
</html>
{{define "demo"}}
<div id="rocket-demo">
  <div class="demo-block">
    <h2>Kanban</h2>
    <div class="kanban">
      <rocket-kanban-board id="kanban-board"
        data-key-select-next="ArrowDown j"
        data-key-select-previous="ArrowUp k"
        data-key-select-left="ArrowLeft h"
        data-key-select-right="ArrowRight l"
        data-key-move-up="Alt+ArrowUp Alt+k"
        data-key-move-down="Alt+ArrowDown Alt+j"
        data-key-move-left="Alt+ArrowLeft Alt+h"
        data-key-move-right="Alt+ArrowRight Alt+l"
        data-key-cancel="Escape"
        data-on:rocket-kanban-move="$cardId = evt.detail?.['cardId'] ?? null; $col = evt.detail?.['col'] ?? null; $before = evt.detail?.['before'] ?? null; @post('/move')"
      >
        {{range .Columns}}
        <section data-kanban-lane="" data-col="{{.ID}}" aria-label="{{.Label}}">
          <h2>{{.Label}}</h2>
          <div data-kanban-lane-cards="">
            {{range .Cards}}
            <article data-kanban-card="{{.ID}}" tabindex="0">
              <button type="button" data-kanban-card-main="">{{.Title}}</button>
            </article>
            {{end}}
          </div>
        </section>
        {{end}}
      </rocket-kanban-board>
    </div>
  </div>
  <div class="demo-block">
    <h2>Sortable list</h2>
    <rocket-sortable-list
      data-on:rocket-sortable-move="$itemId = evt.detail?.['itemId'] ?? null; $before = evt.detail?.['before'] ?? null; @post('/list-move')"
    >
      {{range .List}}
      <div data-sortable-item="{{.ID}}" tabindex="0">{{.Label}}</div>
      {{end}}
    </rocket-sortable-list>
  </div>
</div>
{{end}}
`))
)

func main() {
	addr := flag.String("addr", ":3035", "HTTP listen address")
	bundle := flag.String("bundle", "../../dist/rocket-kit.js", "vendored Rocket bundle")
	datastar := flag.String("datastar", "../../public/js/datastar-rocket.js", "Datastar + Rocket bundle")
	fixture := flag.String("fixture", "../hono-datastar/fixture.json", "shared demo fixture")
	css := flag.String("css", "../hono-datastar/demo.css", "shared demo stylesheet")
	flag.Parse()

	loaded, err := loadModel(*fixture)
	if err != nil {
		log.Fatal(err)
	}
	model = loaded

	mux := http.NewServeMux()
	mux.HandleFunc("GET /", page)
	mux.HandleFunc("POST /move", move)
	mux.HandleFunc("POST /list-move", listMove)
	mux.Handle("GET /rocket-kit.js", staticFile(*bundle, "text/javascript; charset=utf-8"))
	mux.Handle("GET /js/datastar-rocket.js", staticFile(*datastar, "text/javascript; charset=utf-8"))
	mux.Handle("GET /demo.css", staticFile(*css, "text/css; charset=utf-8"))

	log.Printf("Go Rocket kit demo: http://localhost%s", *addr)
	log.Fatal(http.ListenAndServe(*addr, mux))
}

func loadModel(path string) (DemoModel, error) {
	contents, err := os.ReadFile(path)
	if err != nil {
		return DemoModel{}, fmt.Errorf("read fixture %q: %w", path, err)
	}
	var result DemoModel
	if err := json.Unmarshal(contents, &result); err != nil {
		return DemoModel{}, fmt.Errorf("parse fixture %q: %w", path, err)
	}
	return result, nil
}

func page(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	modelMu.Lock()
	defer modelMu.Unlock()
	if err := pageTemplate.Execute(w, model); err != nil {
		log.Printf("render page: %v", err)
	}
}

func move(w http.ResponseWriter, r *http.Request) {
	payload, err := readSignals(r.Body)
	if err != nil {
		http.Error(w, "invalid signals", http.StatusUnprocessableEntity)
		return
	}
	cardID, _ := payload["cardId"].(string)
	col := number(payload["col"])
	before, _ := payload["before"].(string)
	if cardID == "" || col < 0 {
		http.Error(w, "invalid move", http.StatusUnprocessableEntity)
		return
	}

	modelMu.Lock()
	applyMove(&model, cardID, col, before)
	markup, renderErr := renderDemo(model)
	modelMu.Unlock()
	if renderErr != nil {
		http.Error(w, "render failed", http.StatusInternalServerError)
		return
	}
	writePatch(w, "#rocket-demo", markup)
}

func listMove(w http.ResponseWriter, r *http.Request) {
	payload, err := readSignals(r.Body)
	if err != nil {
		http.Error(w, "invalid signals", http.StatusUnprocessableEntity)
		return
	}
	itemID, _ := payload["itemId"].(string)
	before, _ := payload["before"].(string)
	if itemID == "" {
		http.Error(w, "invalid list move", http.StatusUnprocessableEntity)
		return
	}

	modelMu.Lock()
	applyListMove(&model.List, itemID, before)
	markup, renderErr := renderDemo(model)
	modelMu.Unlock()
	if renderErr != nil {
		http.Error(w, "render failed", http.StatusInternalServerError)
		return
	}
	writePatch(w, "#rocket-demo", markup)
}

func readSignals(body io.Reader) (map[string]any, error) {
	var payload map[string]any
	if err := json.NewDecoder(body).Decode(&payload); err != nil {
		return nil, err
	}
	if nested, ok := payload["signals"].(map[string]any); ok {
		return nested, nil
	}
	return payload, nil
}

func number(value any) int {
	switch value := value.(type) {
	case float64:
		return int(value)
	case json.Number:
		parsed, _ := strconv.Atoi(string(value))
		return parsed
	default:
		return -1
	}
}

func applyMove(model *DemoModel, cardID string, col int, before string) {
	var card Card
	found := false
	for columnIndex := range model.Columns {
		cards := model.Columns[columnIndex].Cards[:0]
		for _, candidate := range model.Columns[columnIndex].Cards {
			if candidate.ID == cardID {
				card = candidate
				found = true
				continue
			}
			cards = append(cards, candidate)
		}
		model.Columns[columnIndex].Cards = cards
	}
	if !found || col >= len(model.Columns) {
		return
	}
	target := &model.Columns[col].Cards
	index := len(*target)
	for candidateIndex, candidate := range *target {
		if candidate.ID == before {
			index = candidateIndex
			break
		}
	}
	*target = append(*target, Card{})
	copy((*target)[index+1:], (*target)[index:])
	(*target)[index] = card
}

func applyListMove(items *[]Item, itemID string, before string) {
	var item Item
	found := false
	remaining := (*items)[:0]
	for _, candidate := range *items {
		if candidate.ID == itemID {
			item = candidate
			found = true
			continue
		}
		remaining = append(remaining, candidate)
	}
	if !found {
		return
	}
	index := len(remaining)
	for candidateIndex, candidate := range remaining {
		if candidate.ID == before {
			index = candidateIndex
			break
		}
	}
	remaining = append(remaining, Item{})
	copy(remaining[index+1:], remaining[index:])
	remaining[index] = item
	*items = remaining
}

func renderDemo(value DemoModel) (string, error) {
	var output []byte
	writer := sliceWriter{output: &output}
	if err := pageTemplate.ExecuteTemplate(writer, "demo", value); err != nil {
		return "", err
	}
	return string(output), nil
}

type sliceWriter struct {
	output *[]byte
}

func (w sliceWriter) Write(value []byte) (int, error) {
	*w.output = append(*w.output, value...)
	return len(value), nil
}

func writePatch(w http.ResponseWriter, selector string, markup string) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	fmt.Fprintln(w, "event: datastar-patch-elements")
	fmt.Fprintf(w, "data: selector %s\n", selector)
	fmt.Fprintln(w, "data: mode outer")
	for _, line := range splitLines(markup) {
		fmt.Fprintf(w, "data: elements %s\n", line)
	}
	fmt.Fprintln(w)
}

func splitLines(value string) []string {
	var lines []string
	for len(value) > 0 {
		index := 0
		for index < len(value) && value[index] != '\n' {
			index++
		}
		lines = append(lines, value[:index])
		if index == len(value) {
			break
		}
		value = value[index+1:]
	}
	return lines
}

func staticFile(path string, contentType string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", contentType)
		http.ServeFile(w, r, filepath.Clean(path))
	})
}
