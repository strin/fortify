const fs = require("fs");
const path = require("path");

export const writeToFile = async (
  baseDir: string,
  urlPath: string,
  content: string
) => {
  let filePath = path.join(baseDir, urlPath);
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
    return null;
  } catch (e: any) {
    console.error(e);
    return e;
  }
};
