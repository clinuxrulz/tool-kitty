import { defineConfig } from "unocss";
import presetUno from "unocss/preset-uno";

/* See: https://flowbite.com/docs/ for examples */
export default defineConfig({
	presets: [
        presetUno({
            "dark": "media",
        }),
    ],
    shortcuts: [
        { "main": "bg-white dark:bg-black dark:text-gray-400"},
        { "btn": "text-white bg-blue-700 hover:bg-blue-800 disabled:bg-gray-700 disabled:hover:bg-gray-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800", },
        { "nav-tabs": "flex flex-wrap text-sm font-medium text-center text-gray-500 border-b border-gray-200 dark:border-gray-700 dark:text-gray-400", },
        { "nav-item": "me-2", },
        { "nav-link-selected": "inline-block p-4 text-blue-600 bg-gray-100 rounded-t-lg active dark:bg-gray-800 dark:text-blue-500", },
        { "nav-link": "inline-block p-4 rounded-t-lg hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 dark:hover:text-gray-300", },
        { "list-container": "flex min-w-[240px] flex-col gap-1 p-1.5", },
        { "list-item-selected": "flex flex-row items-baseline w-full px-4 py-2 font-medium text-left rtl:text-right text-white bg-blue-700 border-b border-gray-200 rounded-t-lg cursor-pointer focus:outline-none dark:bg-gray-800 dark:border-gray-600" },
        { "list-item": "flex flex-row items-baseline w-full px-4 py-2 font-medium text-left rtl:text-right border-b border-gray-200 cursor-pointer hover:bg-gray-100 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:hover:text-white dark:focus:ring-gray-500 dark:focus:text-white", },
        { "list-item-button-container": "flex-grow text-right list-item-button-container-2", },
        { "list-item-button": "rounded-md border border-transparent p-2.5 text-center text-sm transition-all text-slate-600 hover:bg-slate-200 focus:bg-slate-200 active:bg-slate-200 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none", },
    ],
    rules: [
    ],
});
