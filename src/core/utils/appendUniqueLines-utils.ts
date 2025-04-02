import * as fs from "fs";
import { AppLogger } from "../../logger/appLogger.js";

export async function appendUniqueLines(
  output: any,
  sourceFile: string,
  destFile: string
): Promise<string> {
  // If destination file doesn't exist, write the output directly
  if (!fs.existsSync(destFile)) {
    fs.writeFileSync(destFile, output, "utf8");
    AppLogger.info(`Created ${destFile} and added rendered content`);
    return fs.readFileSync(destFile, "utf8");
  }

  const sourceContent = fs.existsSync(sourceFile)
    ? fs.readFileSync(sourceFile, "utf8")
    : "";

  if (!sourceContent) {
    AppLogger.warn(`Source file ${sourceFile} is empty. Nothing to process.`);
    return fs.readFileSync(destFile, "utf8");
  }

  const sourceLines = output.split("\n");
  const destContent = fs.readFileSync(destFile, "utf8");
  const destLines = destContent.split("\n");
  const destSet = new Set(
    destLines.map((line) => line.trim()).filter((line) => line !== "")
  );

  const uniqueLines: string[] = [];
  let blockBuffer: string[] = [];
  let insideBlock = false;
  let openBraces = 0;

  for (const line of sourceLines) {
    const trimmed = line.trim();

    if (trimmed.includes("{")) {
      insideBlock = true;
      openBraces++;
    }
    if (trimmed.includes("}")) {
      openBraces--;
    }

    if (insideBlock) {
      blockBuffer.push(line);
    } else if (!destSet.has(trimmed) && trimmed !== "") {
      uniqueLines.push(line);
    }

    if (insideBlock && openBraces === 0) {
      insideBlock = false;
      const blockText = blockBuffer.join("\n");
      if (!destContent.includes(blockText)) {
        uniqueLines.push(blockText);
      }
      blockBuffer = [];
    }
  }

  if (uniqueLines.length > 0) {
    fs.appendFileSync(destFile, "\n" + uniqueLines.join("\n"), "utf8");
    AppLogger.info(`Updated ${destFile} with ${uniqueLines.length} new lines`);
  } else {
    AppLogger.info(
      `No unique lines to append to ${destFile}. File remains unchanged.`
    );
  }

  return fs.readFileSync(destFile, "utf8");
}

