import "@typespec/http";
import "@typespec/openapi";
import "@typespec/openapi3";

using Http;
using OpenAPI;

@service(#{ title: "Polymorphism sample" })
@info(#{ version: "0.0.0" })
namespace Polymorphismsample;

model Cat extends Pet {
  kind: "cat";
  meow: int32;
}

model Dog extends Pet {
  kind: "dog";
  bark: string;
}

@discriminator("kind")
model Pet {
  name: string;
  weight?: float32;

  /**
   * Discriminator property for Pet.
   */
  kind?: string;
}

@route("/Pets") @get op root_read(): Pet;
