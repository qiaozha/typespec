import { deepStrictEqual } from "assert";
import { describe, expect, it } from "vitest";
import { OpenAPI3Encoding, OpenAPI3Schema, OpenAPISchema3_1 } from "../src/types.js";
import { worksFor } from "./works-for.js";

worksFor(["3.0.0", "3.1.0"], ({ openApiFor }) => {
  it("create dedicated model for multipart", async () => {
    const res = await openApiFor(
      `
    model Form { name: HttpPart<string>, profileImage: HttpPart<bytes> }
    op upload(@header contentType: "multipart/form-data", @multipartBody body: Form): void;
    `,
    );
    const op = res.paths["/"].post;
    deepStrictEqual(op.requestBody.content["multipart/form-data"], {
      schema: {
        $ref: "#/components/schemas/Form",
      },
    });
  });

  it("part of type `string` produce `type: string`", async () => {
    const res = await openApiFor(
      `
    op upload(@header contentType: "multipart/form-data", @multipartBody _: { name: HttpPart<string> }): void;
    `,
    );
    const op = res.paths["/"].post;
    deepStrictEqual(op.requestBody.content["multipart/form-data"], {
      schema: {
        type: "object",
        properties: {
          name: {
            type: "string",
          },
        },
        required: ["name"],
      },
    });
  });

  it("part of type `object` produce an object", async () => {
    const res = await openApiFor(
      `
    op upload(@header contentType: "multipart/form-data",  @multipartBody _: { address: HttpPart<{city: string, street: string}>}): void;
    `,
    );
    const op = res.paths["/"].post;
    deepStrictEqual(op.requestBody.content["multipart/form-data"], {
      schema: {
        type: "object",
        properties: {
          address: {
            type: "object",
            properties: {
              city: {
                type: "string",
              },
              street: {
                type: "string",
              },
            },
            required: ["city", "street"],
          },
        },
        required: ["address"],
      },
    });
  });

  it("doc of property is carried to the description field", async () => {
    const res = await openApiFor(
      `
    op upload(@header contentType: "multipart/form-data", @multipartBody _: { /** My doc */ name: HttpPart<string> }): void;
    `,
    );
    const schema = res.paths["/"].post.requestBody.content["multipart/form-data"].schema;
    expect(schema.properties.name.description).toEqual("My doc");
  });

  describe("legacy implicit form", () => {
    it("add MultiPart suffix to model name", async () => {
      const res = await openApiFor(
        `
      model Form { @header contentType: "multipart/form-data", name: string, profileImage: bytes }
      #suppress "deprecated" "For testing to migrate for 1.0-rc"
      op upload(...Form): void;
      `,
      );
      const op = res.paths["/"].post;
      deepStrictEqual(op.requestBody.content["multipart/form-data"], {
        schema: {
          $ref: "#/components/schemas/FormMultiPart",
        },
      });
    });

    it("part of union type doesn't conflict if used in json as well`", async () => {
      const res = await openApiFor(
        `
      union  MyUnion {string, int32}
      #suppress "deprecated" "For testing to migrate for 1.0-rc"
      op upload(@header contentType: "multipart/form-data", profileImage: MyUnion): void;
      `,
      );
      const op = res.paths["/"].post;
      deepStrictEqual(op.requestBody.content["multipart/form-data"], {
        schema: {
          type: "object",
          properties: {
            profileImage: {
              $ref: "#/components/schemas/MyUnion",
            },
          },
          required: ["profileImage"],
        },
      });
    });

    it("part of type `string` produce `type: string`", async () => {
      const res = await openApiFor(
        `
      #suppress "deprecated" "For testing to migrate for 1.0-rc"
      op upload(@header contentType: "multipart/form-data", name: string): void;
      `,
      );
      const op = res.paths["/"].post;
      deepStrictEqual(op.requestBody.content["multipart/form-data"], {
        schema: {
          type: "object",
          properties: {
            name: {
              type: "string",
            },
          },
          required: ["name"],
        },
      });
    });

    it("part of type `object` produce an object", async () => {
      const res = await openApiFor(
        `
      #suppress "deprecated" "For testing to migrate for 1.0-rc"
      op upload(@header contentType: "multipart/form-data", address: {city: string, street: string}): void;
      `,
      );
      const op = res.paths["/"].post;
      deepStrictEqual(op.requestBody.content["multipart/form-data"], {
        schema: {
          type: "object",
          properties: {
            address: {
              type: "object",
              properties: {
                city: {
                  type: "string",
                },
                street: {
                  type: "string",
                },
              },
              required: ["city", "street"],
            },
          },
          required: ["address"],
        },
      });
    });

    it("enum used in both a json payload and multipart part shouldn't create 2 models", async () => {
      const res = await openApiFor(
        `
      enum FilePurpose {
        one,
        two,
      }
      
      interface Files {
        @get listFiles(purpose: FilePurpose): string;
        #suppress "deprecated" "For testing to migrate for 1.0-rc"
        @post uploadFile(@header contentType: "multipart/form-data", purpose: FilePurpose): string;
      }
      `,
      );
      expect(Object.keys(res.components.schemas).length).toBe(1);
      deepStrictEqual(res.components.schemas.FilePurpose, {
        type: "string",
        enum: ["one", "two"],
      });
    });
  });
});

worksFor(["3.0.0"], ({ openApiFor }) => {
  describe("Open API 3.0", () => {
    it("part of type `bytes` produce `type: string, format: binary`", async () => {
      const res = await openApiFor(
        `
      op upload(@header contentType: "multipart/form-data", @multipartBody body: { profileImage: HttpPart<bytes> }): void;
      `,
      );
      const op = res.paths["/"].post;
      deepStrictEqual(op.requestBody.content["multipart/form-data"], {
        schema: {
          type: "object",
          properties: {
            profileImage: {
              format: "binary",
              type: "string",
            },
          },
          required: ["profileImage"],
        },
      });
    });

    it("part of type union `HttpPart<bytes | {content: bytes}>` produce `type: string, format: binary`", async () => {
      const res = await openApiFor(
        `
      op upload(@header contentType: "multipart/form-data", @multipartBody _: {profileImage: HttpPart<bytes | {content: bytes}>}): void;
      `,
      );
      const op = res.paths["/"].post;
      deepStrictEqual(op.requestBody.content["multipart/form-data"], {
        schema: {
          type: "object",
          properties: {
            profileImage: {
              anyOf: [
                {
                  type: "string",
                  format: "binary",
                },
                {
                  type: "object",
                  properties: {
                    content: { type: "string", format: "byte" },
                  },
                  required: ["content"],
                },
              ],
            },
          },
          required: ["profileImage"],
        },
        encoding: {
          profileImage: {
            contentType: "application/octet-stream, application/json",
          },
        },
      });
    });

    it("part of type `bytes[]` produce `type: array, items: {type: string, format: binary}`", async () => {
      const res = await openApiFor(
        `
      op upload(@header contentType: "multipart/form-data",  @multipartBody _: { profileImage: HttpPart<bytes>[]}): void;
      `,
      );
      const op = res.paths["/"].post;
      deepStrictEqual(op.requestBody.content["multipart/form-data"], {
        schema: {
          type: "object",
          properties: {
            profileImage: {
              type: "array",
              items: { type: "string", format: "binary" },
            },
          },
          required: ["profileImage"],
        },
      });
    });

    it("bytes inside a json part will be treated as base64 encoded by default(same as for a json body)", async () => {
      const res = await openApiFor(
        `
      op upload(@header contentType: "multipart/form-data", @multipartBody _: { address: HttpPart<{city: string, icon: bytes}> }): void;
      `,
      );
      const op = res.paths["/"].post;
      deepStrictEqual(
        op.requestBody.content["multipart/form-data"].schema.properties.address.properties.icon,
        {
          type: "string",
          format: "byte",
        },
      );
    });

    describe("part mapping", () => {
      it.each([
        [`string`, { type: "string" }],
        [`bytes`, { type: "string", format: "binary" }],
        [
          `string[]`,
          { type: "array", items: { type: "string" } },
          { contentType: "application/json" },
        ],
        [
          `bytes[]`,
          { type: "array", items: { type: "string", format: "byte" } },
          { contentType: "application/json" },
        ],
        [
          `{@header contentType: "image/png", @body image: bytes}`,
          { type: "string", format: "binary" },
          { contentType: "image/png" },
        ],
        [`File`, { type: "string", format: "binary" }, { contentType: "*/*" }],
        [
          `{@header extra: string, @body body: string}`,
          { type: "string" },
          {
            headers: {
              extra: {
                required: true,
                schema: {
                  type: "string",
                },
              },
            },
          },
        ],
      ] satisfies [string, OpenAPI3Schema, OpenAPI3Encoding?][])(
        `HttpPart<%s>`,
        async (
          type: string,
          expectedSchema: OpenAPI3Schema,
          expectedEncoding?: OpenAPI3Encoding,
        ) => {
          const res = await openApiFor(
            `
        op upload(@header contentType: "multipart/form-data", @multipartBody _: { part: HttpPart<${type}> }): void;
        `,
          );
          const content = res.paths["/"].post.requestBody.content["multipart/form-data"];
          expect(content.schema.properties.part).toEqual(expectedSchema);

          if (expectedEncoding || content.encoding?.part) {
            expect(content.encoding?.part).toEqual(expectedEncoding);
          }
        },
      );
    });

    describe("legacy implicit form", () => {
      it("part of type `bytes` produce `type: string, format: binary`", async () => {
        const res = await openApiFor(
          `
        #suppress "deprecated" "For testing to migrate for 1.0-rc"
        op upload(@header contentType: "multipart/form-data", profileImage: bytes): void;
        `,
        );
        const op = res.paths["/"].post;
        deepStrictEqual(op.requestBody.content["multipart/form-data"], {
          schema: {
            type: "object",
            properties: {
              profileImage: {
                format: "binary",
                type: "string",
              },
            },
            required: ["profileImage"],
          },
        });
      });

      it("part of type union `bytes | {content: bytes}` produce `type: string, format: binary`", async () => {
        const res = await openApiFor(
          `
        #suppress "deprecated" "For testing to migrate for 1.0-rc"
        op upload(@header contentType: "multipart/form-data", profileImage: bytes | {content: bytes}): void;
        `,
        );
        const op = res.paths["/"].post;
        deepStrictEqual(op.requestBody.content["multipart/form-data"], {
          schema: {
            type: "object",
            properties: {
              profileImage: {
                anyOf: [
                  {
                    type: "string",
                    format: "binary",
                  },
                  {
                    type: "object",
                    properties: {
                      content: { type: "string", format: "byte" },
                    },
                    required: ["content"],
                  },
                ],
              },
            },
            required: ["profileImage"],
          },
        });
      });

      it("part of type `bytes[]` produce `type: array, items: {type: string, format: binary}`", async () => {
        const res = await openApiFor(
          `
        #suppress "deprecated" "For testing to migrate for 1.0-rc"
        op upload(@header contentType: "multipart/form-data", profileImage: bytes[]): void;
        `,
        );
        const op = res.paths["/"].post;
        deepStrictEqual(op.requestBody.content["multipart/form-data"], {
          schema: {
            type: "object",
            properties: {
              profileImage: {
                type: "array",
                items: { type: "string", format: "binary" },
              },
            },
            required: ["profileImage"],
          },
        });
      });

      it("bytes inside a json part will be treated as base64 encoded by default(same as for a json body)", async () => {
        const res = await openApiFor(
          `
        #suppress "deprecated" "For testing to migrate for 1.0-rc"
        op upload(@header contentType: "multipart/form-data", address: {city: string, icon: bytes}): void;
        `,
        );
        const op = res.paths["/"].post;
        deepStrictEqual(
          op.requestBody.content["multipart/form-data"].schema.properties.address.properties.icon,
          {
            type: "string",
            format: "byte",
          },
        );
      });
    });
  });
});

worksFor(["3.1.0"], ({ openApiFor }) => {
  describe("Open API 3.1", () => {
    // @see https://spec.openapis.org/oas/v3.1.1.html#encoding-content-type
    it("part of type `bytes` produce empty schema", async () => {
      const res = await openApiFor(
        `
      op upload(@header contentType: "multipart/form-data", @multipartBody body: { profileImage: HttpPart<bytes> }): void;
      `,
      );
      const op = res.paths["/"].post;
      deepStrictEqual(op.requestBody.content["multipart/form-data"], {
        schema: {
          type: "object",
          properties: {
            profileImage: {},
          },
          required: ["profileImage"],
        },
      });
    });

    it("part of type union `HttpPart<bytes | {content: bytes}>` produce `{}, type: string, contentEncoding: base64`", async () => {
      const res = await openApiFor(
        `
      op upload(@header contentType: "multipart/form-data", @multipartBody _: {profileImage: HttpPart<bytes | {content: bytes}>}): void;
      `,
      );
      const op = res.paths["/"].post;
      deepStrictEqual(op.requestBody.content["multipart/form-data"], {
        schema: {
          type: "object",
          properties: {
            profileImage: {
              anyOf: [
                {},
                {
                  type: "object",
                  properties: {
                    content: {
                      type: "string",
                      contentEncoding: "base64",
                    },
                  },
                  required: ["content"],
                },
              ],
            },
          },
          required: ["profileImage"],
        },
        encoding: {
          profileImage: {
            contentType: "application/octet-stream, application/json",
          },
        },
      });
    });

    it("part of type `bytes[]` produce `type: array, items: {}`", async () => {
      const res = await openApiFor(
        `
      op upload(@header contentType: "multipart/form-data",  @multipartBody _: { profileImage: HttpPart<bytes>[]}): void;
      `,
      );
      const op = res.paths["/"].post;
      deepStrictEqual(op.requestBody.content["multipart/form-data"], {
        schema: {
          type: "object",
          properties: {
            profileImage: {
              type: "array",
              items: {},
            },
          },
          required: ["profileImage"],
        },
      });
    });

    it("bytes inside a json part will be treated as base64 encoded by default(same as for a json body)", async () => {
      const res = await openApiFor(
        `
      op upload(@header contentType: "multipart/form-data", @multipartBody _: { address: HttpPart<{city: string, icon: bytes}> }): void;
      `,
      );
      const op = res.paths["/"].post;
      deepStrictEqual(
        op.requestBody.content["multipart/form-data"].schema.properties.address.properties.icon,
        {
          type: "string",
          contentEncoding: "base64",
        },
      );
    });

    describe("part mapping", () => {
      it.each([
        [`string`, { type: "string" }],
        [`bytes`, {}],
        [
          `string[]`,
          { type: "array", items: { type: "string" } },
          { contentType: "application/json" },
        ],
        [
          `bytes[]`,
          {
            type: "array",
            items: {
              type: "string",
              contentEncoding: "base64",
            },
          },
          { contentType: "application/json" },
        ],
        [
          `{@header contentType: "image/png", @body image: bytes}`,
          {},
          { contentType: "image/png" },
        ],
        [`File`, {}, { contentType: "*/*" }],
        [
          `{@header extra: string, @body body: string}`,
          { type: "string" },
          {
            headers: {
              extra: {
                required: true,
                schema: {
                  type: "string",
                },
              },
            },
          },
        ],
      ] satisfies [string, OpenAPISchema3_1, OpenAPI3Encoding?][])(
        `HttpPart<%s>`,
        async (
          type: string,
          expectedSchema: OpenAPI3Schema,
          expectedEncoding?: OpenAPI3Encoding,
        ) => {
          const res = await openApiFor(
            `
        op upload(@header contentType: "multipart/form-data", @multipartBody _: { part: HttpPart<${type}> }): void;
        `,
          );
          const content = res.paths["/"].post.requestBody.content["multipart/form-data"];
          expect(content.schema.properties.part).toEqual(expectedSchema);

          if (expectedEncoding || content.encoding?.part) {
            expect(content.encoding?.part).toEqual(expectedEncoding);
          }
        },
      );
    });

    describe("legacy implicit form", () => {
      it("part of type `bytes` produce `{}`", async () => {
        const res = await openApiFor(
          `
      #suppress "deprecated" "For testing to migrate for 1.0-rc"
        op upload(@header contentType: "multipart/form-data", profileImage: bytes): void;
        `,
        );
        const op = res.paths["/"].post;
        deepStrictEqual(op.requestBody.content["multipart/form-data"], {
          schema: {
            type: "object",
            properties: {
              profileImage: {},
            },
            required: ["profileImage"],
          },
        });
      });

      it("part of type union `bytes | {content: bytes}` produce `{} | { content: {type: string, contentEncoding: 'base64' }`", async () => {
        const res = await openApiFor(
          `
        #suppress "deprecated" "For testing to migrate for 1.0-rc"
        op upload(@header contentType: "multipart/form-data", profileImage: bytes | {content: bytes}): void;
        `,
        );
        const op = res.paths["/"].post;
        deepStrictEqual(op.requestBody.content["multipart/form-data"], {
          schema: {
            type: "object",
            properties: {
              profileImage: {
                anyOf: [
                  {},
                  {
                    type: "object",
                    properties: {
                      content: { type: "string", contentEncoding: "base64" },
                    },
                    required: ["content"],
                  },
                ],
              },
            },
            required: ["profileImage"],
          },
        });
      });

      it("part of type `bytes[]` produce `type: array, items: {}`", async () => {
        const res = await openApiFor(
          `
        #suppress "deprecated" "For testing to migrate for 1.0-rc"
        op upload(@header contentType: "multipart/form-data", profileImage: bytes[]): void;
        `,
        );
        const op = res.paths["/"].post;
        deepStrictEqual(op.requestBody.content["multipart/form-data"], {
          schema: {
            type: "object",
            properties: {
              profileImage: {
                type: "array",
                items: {},
              },
            },
            required: ["profileImage"],
          },
        });
      });

      it("bytes inside a json part will be treated as base64 encoded by default(same as for a json body)", async () => {
        const res = await openApiFor(
          `
        #suppress "deprecated" "For testing to migrate for 1.0-rc"
        op upload(@header contentType: "multipart/form-data", address: {city: string, icon: bytes}): void;
        `,
        );
        const op = res.paths["/"].post;
        deepStrictEqual(
          op.requestBody.content["multipart/form-data"].schema.properties.address.properties.icon,
          {
            type: "string",
            contentEncoding: "base64",
          },
        );
      });
    });
  });
});
