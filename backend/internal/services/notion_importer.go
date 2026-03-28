package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"
)

type NotionImporter struct{}

func NewNotionImporter() *NotionImporter {
	return &NotionImporter{}
}

type NotionResponse struct {
	RecordMap struct {
		Block map[string]struct {
			Value NotionBlock `json:"value"`
		} `json:"block"`
	} `json:"recordMap"`
}

type NotionBlock struct {
	ID         string   `json:"id"`
	Type       string   `json:"type"`
	Properties struct {
		Title [][]interface{} `json:"title"`
	} `json:"properties"`
	Content []string `json:"content"` // Children IDs
}

// BlockNoteBlock matches what BlockNote frontend expects
type BlockNoteBlock struct {
	ID      string                   `json:"id"`
	Type    string                   `json:"type"`
	Props   map[string]interface{}   `json:"props,omitempty"`
	Content []BlockNoteInlineContent `json:"content"`
	Children []BlockNoteBlock        `json:"children,omitempty"`
}

type BlockNoteInlineContent struct {
	Type   string                 `json:"type"`
	Text   string                 `json:"text"`
	Styles map[string]interface{} `json:"styles"`
}

// ImportURL parses a Notion URL, calls the unoffical API, and converts to BlockNote format
func (s *NotionImporter) ImportURL(url string) (string, []BlockNoteBlock, error) {
	pageId, err := extractPageID(url)
	if err != nil {
		return "", nil, err
	}
	
	payload := map[string]interface{}{
		"pageId":          pageId,
		"limit":           100,
		"cursor":          map[string]interface{}{"stack": []interface{}{}},
		"chunkNumber":     0,
		"verticalColumns": false,
	}
	bodyBytes, _ := json.Marshal(payload)
	
	req, err := http.NewRequest("POST", "https://www.notion.so/api/v3/loadPageChunk", bytes.NewBuffer(bodyBytes))
	if err != nil {
		return "", nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", nil, err
	}
	defer resp.Body.Close()
	
	var res NotionResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return "", nil, err
	}
	
	blocksMap := res.RecordMap.Block
	pageBlock, ok := blocksMap[pageId]
	if !ok {
		return "", nil, fmt.Errorf("page ID not found in response")
	}
	
	title := buildPlainText(pageBlock.Value.Properties.Title)
	if title == "" {
		title = "Imported Document"
	}
	
	// recursively build blocks
	bnBlocks := s.buildChildren(pageBlock.Value.Content, blocksMap)
	
	return title, bnBlocks, nil
}

func (s *NotionImporter) buildChildren(contentIDs []string, blocksMap map[string]struct{Value NotionBlock `json:"value"`}) []BlockNoteBlock {
	var result []BlockNoteBlock
	for _, id := range contentIDs {
		block, ok := blocksMap[id]
		if !ok {
			continue
		}
		
		bnType, props := mapNotionType(block.Value.Type)
		// Only support types that blocknote understands mapping
		if bnType == "unsupported" {
			continue 
		}

		inlineContent := parseInlineContent(block.Value.Properties.Title)
		
		bnBlock := BlockNoteBlock{
			ID:      block.Value.ID,
			Type:    bnType,
			Props:   props,
			Content: inlineContent,
		}
		
		// Recurse for nested (e.g., bullet items inside bullet items)
		if len(block.Value.Content) > 0 {
			bnBlock.Children = s.buildChildren(block.Value.Content, blocksMap)
		}
		
		result = append(result, bnBlock)
	}
	return result
}

func mapNotionType(notionType string) (string, map[string]interface{}) {
	switch notionType {
	case "text":
		return "paragraph", nil
	case "header":
		return "heading", map[string]interface{}{"level": 1}
	case "sub_header":
		return "heading", map[string]interface{}{"level": 2}
	case "sub_sub_header":
		return "heading", map[string]interface{}{"level": 3}
	case "bulleted_list":
		return "bulletListItem", nil
	case "numbered_list":
		return "numberedListItem", nil
	case "quote":
		return "paragraph", nil // Can use blockquote but let's stick to safe fallback
	default:
		// Unsupported block types like 'divider' might break blocknote if passed directly
		return "unsupported", nil
	}
}

func parseInlineContent(notionTitle [][]interface{}) []BlockNoteInlineContent {
	var result []BlockNoteInlineContent
	for _, chunk := range notionTitle {
		if len(chunk) == 0 {
			continue
		}
		text, ok := chunk[0].(string)
		if !ok {
			continue
		}
		
		styles := make(map[string]interface{})
		if len(chunk) > 1 {
			// Extract modifiers
			modifiers, ok := chunk[1].([]interface{})
			if ok {
				for _, mod := range modifiers {
					modArray, ok := mod.([]interface{})
					if ok && len(modArray) > 0 {
						switch modArray[0].(string) {
						case "b":
							styles["bold"] = true
						case "i":
							styles["italic"] = true
						case "s":
							styles["strike"] = true
						case "_":
							styles["underline"] = true
						case "c":
							styles["code"] = true
						}
					}
				}
			}
		}
		
		result = append(result, BlockNoteInlineContent{
			Type:   "text",
			Text:   text,
			Styles: styles,
		})
	}
	return result
}

func buildPlainText(notionTitle [][]interface{}) string {
	var sb strings.Builder
	for _, chunk := range notionTitle {
		if len(chunk) > 0 {
			if text, ok := chunk[0].(string); ok {
				sb.WriteString(text)
			}
		}
	}
	return sb.String()
}

func extractPageID(url string) (string, error) {
	// Notion IDs are 32 hex chars, often separated by dashes or not.
	// URL example: https://clever-angora-554.notion.site/Senin-Tauhid-Mengenal-Allah-33164f4f2e7b80a286ecfbe199a6390a
	re := regexp.MustCompile(`([a-f0-9]{32,})`)
	matches := re.FindStringSubmatch(url)
	if len(matches) > 1 {
		idStr := matches[1]
		if len(idStr) >= 32 {
			// ensure format: 8-4-4-4-12
			formatted := fmt.Sprintf("%s-%s-%s-%s-%s", idStr[0:8], idStr[8:12], idStr[12:16], idStr[16:20], idStr[20:32])
			return formatted, nil
		}
	}
	return "", fmt.Errorf("could not extract valid 32-char UUID from url")
}
