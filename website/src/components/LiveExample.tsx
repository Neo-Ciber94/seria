import { useState, useRef, useEffect } from "react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { a11yDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { minimalEditor } from "prism-code-editor/setups";
import "prism-code-editor/prism/languages/javascript";
import * as seria from "seria";

const INITIAL_CODE = `{
    name: "Satoru Gojo",
    age: 28,
    alive: true
}`;

type StringifyMode = "json" | "seria";

export default function LiveExample() {
  const [code, setCode] = useState(INITIAL_CODE);
  const editorEl = useRef<HTMLDivElement>();
  const [stringifyMode, setStringifyMode] = useState<StringifyMode>("seria");
  const [stringifyResult, setStringifyResult] = useState<{
    json: string;
    success: boolean;
  }>();

  useEffect(() => {
    if (!editorEl.current) {
      return;
    }

    minimalEditor(
      editorEl.current,
      {
        language: "javascript",
        theme: "github-dark",
        value: code,
        lineNumbers: false,
        onUpdate(value) {
          setCode(value);
        },
      },
      () => console.log("ready")
    );
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const obj = eval(`(${code})`);
        setStringifyResult({ json: "Resolving...", success: false });

        const json = await (async function () {
          switch (stringifyMode) {
            case "json":
              return JSON.stringify(obj, null, 2);
            case "seria": {
              return await seria.stringifyAsync(obj, null, 2);
            }
          }
        })();

        setStringifyResult({ json, success: true });
      } catch (err) {
        console.error(err);
        const json = err?.message ?? "Failed to stringify";
        setStringifyResult({ json, success: false });
      }
    })();
  }, [code, stringifyMode]);

  return (
    <div className="p-4 flex flex-col lg:flex-row w-full h-full gap-2">
      <div ref={editorEl} className="w-full h-full" />

      <div className="w-full h-full">
        <select
          value={stringifyMode}
          onChange={(e) => {
            setStringifyMode(e.target.value as StringifyMode);
          }}
        >
          <option value="seria">seria.stringify</option>
          <option value="json">JSON.stringify</option>
        </select>
        {stringifyResult && (
          <StringifyPreview success={stringifyResult.success}>
            {stringifyResult.json}
          </StringifyPreview>
        )}
      </div>
    </div>
  );
}

function StringifyPreview({
  children,
  success,
}: {
  children: string;
  success: boolean;
}) {
  if (!success) {
    return (
      <div className="p-4 bg-neutral-800 text-red-500 font-mono">
        {children}
      </div>
    );
  }

  return (
    <SyntaxHighlighter language={"json"} style={a11yDark} wrapLines={true}>
      {children}
    </SyntaxHighlighter>
  );
}
