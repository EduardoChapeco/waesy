import fs from "fs";

const files = process.argv.slice(2);
for (const file of files) {
  try {
    if (fs.existsSync(file)) {
      let content = fs.readFileSync(file, "utf8");
      if (content.includes("\r\n")) {
        content = content.replace(/\r\n/g, "\n");
        fs.writeFileSync(file, content, "utf8");
        console.log(`Normalized CRLF to LF: ${file}`);
      } else {
        console.log(`Already LF: ${file}`);
      }
    } else {
      console.warn(`File not found: ${file}`);
    }
  } catch (err) {
    console.error(`Error processing ${file}:`, err);
  }
}
