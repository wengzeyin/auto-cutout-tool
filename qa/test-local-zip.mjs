import JSZip from "../vendor-jszip.mjs";

const zip = new JSZip();
zip.file("root.txt", "hello");
zip.folder("assets").file("icon.svg", "<svg></svg>");

const bytes = await zip.generateAsync({ type: "uint8array" });
const text = new TextDecoder().decode(bytes);
const failures = [];

if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) failures.push("ZIP signature is missing.");
if (!text.includes("root.txt")) failures.push("root.txt filename is missing from ZIP directory.");
if (!text.includes("assets/icon.svg")) failures.push("folder filename is missing from ZIP directory.");
if (bytes.length < 200) failures.push(`ZIP output is unexpectedly small: ${bytes.length} bytes.`);

const result = { pass: failures.length === 0, size: bytes.length, failures };
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
