import { fileURLToPath, URL } from "url";
import { createProgram } from "../../core/program.js";
import { NodeHost } from "../../core/util.js";

const libs = ["simple"];

describe("cadl: libraries", () => {
  for (const lib of libs) {
    describe(lib, () => {
      it("compiles without error", async () => {
        try {
          const mainFile = fileURLToPath(
            new URL(`../../../test/libraries/${lib}/main.cadl`, import.meta.url)
          );
          await createProgram(NodeHost, mainFile, { noEmit: true });
        } catch (e) {
          console.error(e.diagnostics);
          throw e;
        }
      });
    });
  }
});