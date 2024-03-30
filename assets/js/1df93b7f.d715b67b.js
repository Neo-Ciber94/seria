"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[583],{9307:(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{A:()=>LiveExample});var react__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__(8318),prism_code_editor__WEBPACK_IMPORTED_MODULE_6__=__webpack_require__(8406),seria__WEBPACK_IMPORTED_MODULE_7__=__webpack_require__(2456),_headlessui_react__WEBPACK_IMPORTED_MODULE_10__=__webpack_require__(2369),_headlessui_react__WEBPACK_IMPORTED_MODULE_12__=__webpack_require__(2133),_heroicons_react_20_solid__WEBPACK_IMPORTED_MODULE_11__=__webpack_require__(6743),_heroicons_react_20_solid__WEBPACK_IMPORTED_MODULE_13__=__webpack_require__(8273),_hooks_useTheme__WEBPACK_IMPORTED_MODULE_1__=__webpack_require__(2059),prism_code_editor_themes__WEBPACK_IMPORTED_MODULE_5__=__webpack_require__(2068),prism_code_editor_prism_languages_javascript__WEBPACK_IMPORTED_MODULE_2__=__webpack_require__(1014),prism_code_editor_layout_css__WEBPACK_IMPORTED_MODULE_3__=__webpack_require__(1016),react_icons_si__WEBPACK_IMPORTED_MODULE_8__=__webpack_require__(1967),react_icons_vsc__WEBPACK_IMPORTED_MODULE_9__=__webpack_require__(1567),react_icons_cg__WEBPACK_IMPORTED_MODULE_14__=__webpack_require__(7769),react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__=__webpack_require__(9214);const EDITOR_STYLES={dark:"",light:""};Promise.all([(0,prism_code_editor_themes__WEBPACK_IMPORTED_MODULE_5__.E)("github-dark"),(0,prism_code_editor_themes__WEBPACK_IMPORTED_MODULE_5__.E)("github-light")]).then((_=>{let[e,t]=_;EDITOR_STYLES.dark=e,EDITOR_STYLES.light=t}));const INITIAL_CODE='{\n  name: "Satoru Gojo",\n  age: 28,\n  alive: true,\n  birthdate: new Date(1989, 11, 7),\n  zodiac_sign: Symbol.for("Sagittarius"),\n  ability: delay(1000).then(() => "Limitless"),\n  favorite_colors: new Set(["red", "blue", "purple"]),\n  affiliations: new Map([\n      ["school", "Tokyo Metropolitan Curse Technical College"],\n      ["organization", "Jujutsu Sorcerers"]\n  ])\n}';function LiveExample(){const[_,e]=(0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(INITIAL_CODE),t=(0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(),r=(0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(),[s,a]=(0,react__WEBPACK_IMPORTED_MODULE_0__.useState)("seria.stringify"),[n,i]=(0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(),[l,c]=(0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(!1),o=(0,_hooks_useTheme__WEBPACK_IMPORTED_MODULE_1__.D)(),E=l||"loading"===n?.state;return(0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)((()=>{if(t.current)return r.current=(0,prism_code_editor__WEBPACK_IMPORTED_MODULE_6__.c)(t.current,{language:"javascript",value:_,lineNumbers:!1,onUpdate(_){e(_)}}),()=>{r.current&&r.current.remove()}}),[o]),(0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)((()=>{(async()=>{try{const e=safeEval(_);switch(s){case"json.stringify":{const _=JSON.stringify(e,null,2);i({state:"success",json:_});break}case"seria.stringify":{i({state:"loading"});const _=await seria__WEBPACK_IMPORTED_MODULE_7__.ql(e,null,2);i({state:"success",json:_});break}case"seria.stringifyToStream":{i({state:"loading"});const _=[],t=seria__WEBPACK_IMPORTED_MODULE_7__.$O(e,null,2).getReader();c(!0);try{for(;;){const{done:e,value:r}=await t.read();if(e||void 0===r)break;_.push(r),i({state:"success",json:_})}}finally{c(!1)}break}}}catch(e){console.error(e);i({state:"error",message:e?.message??"Failed to stringify"})}})()}),[_,s]),(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div",{children:[(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("style",{id:"editor-theme",dangerouslySetInnerHTML:{__html:"dark"===o?EDITOR_STYLES.dark:EDITOR_STYLES.light}}),(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("h1",{className:"text-center text-xl sm:text-3xl",children:["Try out"," ",(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("span",{className:"text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-pink-300 to-pink-400",children:"seria"})," ","serialization!"]}),(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div",{className:"p-2 flex flex-col xl:flex-row w-full justify-around h-full gap-2",children:[(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div",{className:"h-auto flex flex-col",children:[(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("div",{className:"w-full h-full min-h-32 xl:w-[600px] dark:bg-[#0d1117] text-black dark:text-white bg-white xl:min-h-[300px] border border-gray-400 shadow rounded-lg overflow-hidden",children:(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("div",{ref:t})}),(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div",{className:"flex flex-row items-center gap-2 bg-black text-white py-2 px-4 font-semibold text-lg rounded-md mt-2",children:[(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("span",{className:"leading-none text-yellow-400 text-2xl",children:(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)(react_icons_si__WEBPACK_IMPORTED_MODULE_8__.AeH,{})}),"Javascript"]})]}),(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div",{className:"h-auto flex flex-col",children:[(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div",{className:"relative w-full xl:w-[600px] xl:min-h-[300px] h-full",children:[(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("div",{className:"absolute right-0 top-0",children:(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)(StringifyModeSelect,{value:s,onChange:a})}),n&&(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)(StringifyPreview,{result:n})]}),(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div",{className:"flex items-center flex-row gap-1 bg-black text-white py-2 px-4 font-semibold text-lg rounded-md mt-2",children:[E?(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)(Spinner,{}):(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("span",{className:"leading-none text-3xl text-pink-500",children:(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)(react_icons_vsc__WEBPACK_IMPORTED_MODULE_9__.ntS,{})}),E?"Processing...":"Output"]})]})]})]})}function StringifyPreview(_){let{result:e}=_;switch(e.state){case"loading":return(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("div",{className:"px-4 py-10 bg-white dark:bg-neutral-800 text-green-500 font-mono h-full w-full flex rounded-lg min-h-[inherit] text-xs sm:text-sm",children:"Resolving..."});case"error":return(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("div",{className:"px-4 py-10 bg-white dark:bg-neutral-800 text-red-500 font-mono h-full w-full rounded-lg min-h-[inherit] text-xs sm:text-sm",children:e.message});case"success":return(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("div",{className:"p-4 bg-white dark:bg-neutral-800 rounded-lg w-full h-full min-h-[inherit] text-xs sm:text-sm",children:getArray(e.json).map(((_,e)=>(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("pre",{className:"bg-transparent my-0 py-0 "+(e%2==0?"text-pink-600 dark:text-pink-400":"text-indigo-600 dark:text-indigo-400"),children:(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("code",{className:"text-wrap",children:_})},e)))})}}const STRINGIFY_MODES=[{name:"seria.stringify",value:"seria.stringify"},{name:"seria.stringifyToStream",value:"seria.stringifyToStream"},{name:"JSON.stringify",value:"json.stringify"}];function DisplayMode(_){let{name:e}=_;const t=e.split(".");return(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.Fragment,{children:[(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("span",{className:"font-bold text-pink-600",children:t[0]}),".",(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("span",{className:"",children:t[1]})]})}function StringifyModeSelect(_){let{value:e,onChange:t}=_;return(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)(_headlessui_react__WEBPACK_IMPORTED_MODULE_10__.W,{value:e,onChange:_=>{console.log(_),t(_)},children:(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div",{className:"relative mt-1 w-[240px]",children:[(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)(_headlessui_react__WEBPACK_IMPORTED_MODULE_10__.W.Button,{className:"relative border-none w-full cursor-default rounded-lg bg-white dark:bg-neutral-900 py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm",children:[(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("span",{className:"block truncate text-black dark:text-white font-mono",children:(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)(DisplayMode,{name:(_=>STRINGIFY_MODES.find((e=>e.value===_))?.name)(e)})}),(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("span",{className:"pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2",children:(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)(_heroicons_react_20_solid__WEBPACK_IMPORTED_MODULE_11__.A,{className:"h-5 w-5 text-gray-400","aria-hidden":"true"})})]}),(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)(_headlessui_react__WEBPACK_IMPORTED_MODULE_12__.e,{as:react__WEBPACK_IMPORTED_MODULE_0__.Fragment,leave:"transition ease-in duration-100",leaveFrom:"opacity-100",leaveTo:"opacity-0",children:(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)(_headlessui_react__WEBPACK_IMPORTED_MODULE_10__.W.Options,{className:"absolute mt-1 max-h-60 w-full overflow-auto rounded-md dark:bg-neutral-900 bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm pl-0",style:{listStyle:"none"},children:STRINGIFY_MODES.map((_=>(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)(_headlessui_react__WEBPACK_IMPORTED_MODULE_10__.W.Option,{value:_.value,className:_=>{let{active:e}=_;return"relative cursor-default select-none py-2 pl-10 pr-4 "+(e?"bg-indigo-200 dark:bg-neutral-700 text-indigo-900":"text-gray-900")},children:e=>{let{selected:t}=e;return(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.Fragment,{children:[(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("span",{className:"block truncate font-mono dark:text-white "+(t?"font-medium":"font-normal"),children:(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)(DisplayMode,{name:_.name})}),t?(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("span",{className:"absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-500",children:(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)(_heroicons_react_20_solid__WEBPACK_IMPORTED_MODULE_13__.A,{className:"h-5 w-5","aria-hidden":"true"})}):null]})}},_.value)))})})]})})}function safeEval(code){if("undefined"==typeof window)throw new Error("Safe eval can only run on the browser");const globalsVar=`w_${Math.ceil(1e6*Math.random())}`,scope=`\n        // Save window objects for later restoration\n        const ${globalsVar} = {};\n        ['alert', 'confirm', 'prompt', 'close', 'open', 'console', 'querySelector', 'querySelectorAll', 'getElementById', 'getElementsByClassName', 'getElementsByTagName'].forEach(prop => {\n            ${globalsVar}[prop] = window[prop];\n            delete window[prop];\n        });\n\n        // Custom functions\n        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));\n\n        (function() {\n            // Try-finally block for restoring window objects\n            try {\n                return (${code})\n            } finally {\n                // Restore window objects\n                Object.keys(${globalsVar}).forEach(prop => {\n                    window[prop] = ${globalsVar}[prop];\n                });\n            }\n        })()\n    `;return eval(scope)}function getArray(_){return Array.isArray(_)?_:[_]}function Spinner(){return(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("span",{className:"text-2xl animate-spin origin-center leading-[0] m-0 p-0",children:(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)(react_icons_cg__WEBPACK_IMPORTED_MODULE_14__.AhV,{})})}},2059:(_,e,t)=>{t.d(e,{D:()=>s});var r=t(8318);function s(){const[_,e]=(0,r.useState)("dark");return(0,r.useLayoutEffect)((()=>{const _=()=>{const _=document.documentElement.getAttribute("data-theme");e("dark"===_?"dark":"light")},t=new MutationObserver((e=>{e.forEach((function(e){"attributes"===e.type&&"data-theme"===e.attributeName&&_()}))}));return _(),t.observe(document.documentElement,{attributes:!0}),()=>{t.disconnect()}}),[]),_}},9761:(_,e,t)=>{t.r(e),t.d(e,{default:()=>c});var r=t(9392),s=t(7288),a=t(6455),n=t(2452),i=t(9214);function l(){const{siteConfig:_}=(0,s.A)();return(0,i.jsxs)("section",{className:"pattern-cross pattern-indigo-500 pattern-bg-indigo-600 pattern-size-8 pattern-opacity-100 py-10 sm:pt-20 px-4 h-full flex-grow flex flex-col gap-2",children:[(0,i.jsxs)("div",{children:[(0,i.jsx)("h1",{className:"text-white text-center text-3xl lg:text-5xl",children:_.title}),(0,i.jsx)("h3",{className:"text-white text-center text-xl lg:text-3xl",children:_.tagline})]}),(0,i.jsx)("div",{className:"mt-10 text-center",children:(0,i.jsx)(r.A,{className:"bg-black py-2 px-10 lg:px-32 rounded-lg !text-white font-bold text-base lg:text-xl hover:bg-neutral-800",to:"/docs/getting-started/installation",style:{textDecoration:"none"},children:"Getting Started"})}),(0,i.jsx)("div",{className:"text-white bg-black/30 py-8 px-2 rounded-lg mt-10 mb-2 mx-auto xl:max-w-7xl w-full",children:(0,i.jsx)(n.A,{fallback:(0,i.jsx)("div",{className:"text-2xl opacity-50 animate-pulse",children:"Loading..."}),children:()=>{const _=t(9307).A;return(0,i.jsx)(_,{})}})})]})}function c(){const{siteConfig:_}=(0,s.A)();return(0,i.jsx)(a.A,{title:"Serialization beyond JSON",description:_.tagline,children:(0,i.jsx)(l,{})})}}}]);