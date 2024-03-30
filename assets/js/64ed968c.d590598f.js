"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[784],{9010:(e,t,r)=>{r.r(t),r.d(t,{assets:()=>c,contentTitle:()=>a,default:()=>d,frontMatter:()=>s,metadata:()=>o,toc:()=>l});var n=r(9214),i=r(5629);const s={sidebar_position:5},a="Serializing Generators",o={id:"getting-started/serializing-generators",title:"Serializing Generators",description:"Async iterables can also be serialized by seria. Although you can serialize them using seria.stringifyAsync we recommend",source:"@site/docs/getting-started/serializing-generators.md",sourceDirName:"getting-started",slug:"/getting-started/serializing-generators",permalink:"/seria/docs/getting-started/serializing-generators",draft:!1,unlisted:!1,editUrl:"https://github.com/Neo-Ciber94/seria/website/docs/docs/getting-started/serializing-generators.md",tags:[],version:"current",sidebarPosition:5,frontMatter:{sidebar_position:5},sidebar:"docsSidebar",previous:{title:"Serializing Promises",permalink:"/seria/docs/getting-started/serializing-promises"},next:{title:"Working with FormData",permalink:"/seria/docs/category/working-with-formdata"}},c={},l=[{value:"stringifyToStream",id:"stringifytostream",level:2}];function g(e){const t={code:"code",h1:"h1",h2:"h2",p:"p",pre:"pre",...(0,i.R)(),...e.components};return(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(t.h1,{id:"serializing-generators",children:"Serializing Generators"}),"\n",(0,n.jsxs)(t.p,{children:["Async iterables can also be serialized by ",(0,n.jsx)(t.code,{children:"seria"}),". Although you can serialize them using ",(0,n.jsx)(t.code,{children:"seria.stringifyAsync"})," we recommend\nusing streaming otherwise we will just wait for the generator to resolve before returning the values, with streaming we don't block\nwhile generating the values."]}),"\n",(0,n.jsx)(t.h2,{id:"stringifytostream",children:"stringifyToStream"}),"\n",(0,n.jsxs)(t.p,{children:["When using ",(0,n.jsx)(t.code,{children:"seria.stringifyToStream"})," the returning stream will emit each of the values returned from the generator."]}),"\n",(0,n.jsx)(t.pre,{children:(0,n.jsx)(t.code,{className:"language-ts",children:'import { stringifyToStream, parseFromStream } from "seria";\n\nasync function* range(from: number, to: number) {\n  for (let i = from; i <= to; i++) {\n    yield i;\n  }\n}\n\nconst stream = stringifyToStream(range(1, 10));\nconst value = await parseFromStream(stream);\n\nfor await (const item of value as any) {\n  console.log(item);\n}\n'})})]})}function d(e={}){const{wrapper:t}={...(0,i.R)(),...e.components};return t?(0,n.jsx)(t,{...e,children:(0,n.jsx)(g,{...e})}):g(e)}},5629:(e,t,r)=>{r.d(t,{R:()=>a,x:()=>o});var n=r(8318);const i={},s=n.createContext(i);function a(e){const t=n.useContext(s);return n.useMemo((function(){return"function"==typeof e?e(t):{...t,...e}}),[t,e])}function o(e){let t;return t=e.disableParentContext?"function"==typeof e.components?e.components(i):e.components||i:a(e.components),n.createElement(s.Provider,{value:t},e.children)}}}]);