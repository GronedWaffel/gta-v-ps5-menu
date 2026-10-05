export const targets=["11.00", "11.20", "11.60", "12.00", "12.02", "12.20", "12.40", "12.60", "12.70", "13.00", "13.20", "13.40", "13.42", "13.60"];
export const supportedCode=code=>targets.some(f=>Math.round(Number(f)*100)===code);
export function rejection(ua){const fw=/PlayStation 5\/(\d+\.\d+)/.exec(ua)?.[1];return !fw?"Open this page on your PS5.":!targets.includes(fw)?"Unsupported PS5 firmware "+fw:null;}
