import { createReactBlockSpec } from "@blocknote/react";
import MonacoEditor from "@monaco-editor/react";
import { useUIStore } from "../../../store/useUIStore";
import { Code2 } from "lucide-react";

export const MonacoBlock = createReactBlockSpec(
  {
    type: "monacoCode",
    propSchema: {
      code: { default: "", type: "string" },
      language: { default: "javascript", type: "string" },
    },
    content: "none",
  },
  {
    render: (props) => {
      const isDark = useUIStore((s) => s.isDarkMode);
      
      const handleChange = (val: string | undefined) => {
        props.editor.updateBlock(props.block.id, {
          props: { ...props.block.props, code: val || "" },
        });
      };

      return (
        <div style={{ width: '100%', padding: '10px 0' }} contentEditable={false}>
          <div style={{ 
            borderRadius: '8px', 
            overflow: 'hidden', 
            border: isDark ? '1px solid #374151' : '1px solid #e5e7eb',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
          }}>
            <div style={{ padding: '8px 16px', background: isDark ? '#1f2937' : '#f9fafb', fontSize: '12px', color: '#6b7280', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Code2 size={14} /> 
                <select 
                  value={props.block.props.language} 
                  onChange={(e) => props.editor.updateBlock(props.block.id, { props: { ...props.block.props, language: e.target.value }})}
                  style={{ background: 'transparent', border: 'none', outline: 'none', color: 'inherit', fontWeight: 'bold', cursor: 'pointer' }}>
                  <option value="javascript">JavaScript</option>
                  <option value="typescript">TypeScript</option>
                  <option value="python">Python</option>
                  <option value="html">HTML</option>
                  <option value="css">CSS</option>
                  <option value="json">JSON</option>
                  <option value="go">Go</option>
                </select>
              </div>
            </div>
            <MonacoEditor
              height="250px"
              language={props.block.props.language}
              theme={isDark ? "vs-dark" : "light"}
              value={props.block.props.code}
              onChange={handleChange}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                fontFamily: "'Fira Code', 'Menlo', 'Monaco', 'Consolas', monospace",
                wordWrap: 'on',
                lineNumbers: "on",
                autoClosingBrackets: "always",
                autoClosingQuotes: "always",
                suggestOnTriggerCharacters: true,
                padding: { top: 12, bottom: 12 },
                tabSize: 2
              }}
            />
          </div>
        </div>
      );
    },
  }
);
