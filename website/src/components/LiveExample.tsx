import { useState, useRef, useEffect } from "react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { a11yDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { minimalEditor } from "prism-code-editor/setups";
import "prism-code-editor/prism/languages/javascript";
import * as seria from "seria";

const INITIAL_CODE = `{
    name: "Satoru Gojo",
    age: 28,
    alive: true,
    birthdate: new Date(1989, 11, 7),
    zodiac_sign: Symbol.for("Sagittarius"),
    ability: delay(1000).then(() => "Limitless")
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
        const obj = safeEval(code);
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
    <div className="p-4">
      <h1 className="text-center">Try out seria serialization!</h1>
      <div className="p-4 flex flex-col lg:flex-row w-full h-full gap-2">
        <div className="w-full h-full">
          <h2>Javascript</h2>
          <div ref={editorEl} className="w-full h-full" />
        </div>

        <div className="w-full h-full">
          <h2>Result</h2>
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
    <SyntaxHighlighter
      language={"json"}
      style={a11yDark}
      wrapLongLines
      wrapLines
    >
      {children}
    </SyntaxHighlighter>
  );
}

function safeEval(code: string) {
  const varName = `w_${Math.ceil(Math.random() * 1000_000)}`;
  console.log(varName);
  const scope = `
        // Save window objects for later restoration
        const ${varName} = {};
        ['fetch', 'alert', 'confirm', 'prompt', 'close', 'open', 'console', 'querySelector', 'querySelectorAll', 'getElementById', 'getElementsByClassName', 'getElementsByTagName'].forEach(prop => {
            ${varName}[prop] = window[prop];
            delete window[prop];
        });

        // Custom functions
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        (function() {
            // Try-finally block for restoring window objects
            try {
                return (${code})
            } finally {
                // Restore window objects
                Object.keys(${varName}).forEach(prop => {
                    window[prop] = ${varName}[prop];
                });
            }
        })()
    `;

  return eval(scope);
}
