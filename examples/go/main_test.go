package main

import "testing"

func TestApplyMoveRejectsInvalidDestinationWithoutLosingCard(t *testing.T) {
	model := DemoModel{Columns: []Column{
		{ID: 10, Cards: []Card{{ID: "card-a", Title: "A"}}},
		{ID: 20, Cards: []Card{{ID: "card-b", Title: "B"}}},
	}}
	applyMove(&model, "card-a", 30, "")
	applyMove(&model, "card-a", -1, "")
	applyMove(&model, "card-a", 20, "missing")
	if len(model.Columns[0].Cards) != 1 || model.Columns[0].Cards[0].ID != "card-a" {
		t.Fatal("rejected move removed the source card")
	}
	applyMove(&model, "card-a", 20, "card-b")
	if len(model.Columns[0].Cards) != 0 || len(model.Columns[1].Cards) != 2 || model.Columns[1].Cards[0].ID != "card-a" {
		t.Fatal("valid move did not insert in the destination")
	}
}
