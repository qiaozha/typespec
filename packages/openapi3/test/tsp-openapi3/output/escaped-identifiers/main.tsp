import "@typespec/http";
import "@typespec/openapi";
import "@typespec/openapi3";

using Http;
using OpenAPI;

@service(#{ title: "Sample API" })
@info(#{ version: "1.0.0" })
namespace SampleAPI;

scalar `Foo-Bar` extends string;

model `Escaped-Model` {
  id: string;
  `escaped-property`?: string;
}

@route("/{escaped-property}") @get op `get-thing`(
  @query(#{ explode: true }) `weird@param`?: `Foo-Bar`,
  ...Parameters.`Escaped-Model`.`escaped-property`,
  @body body: `Escaped-Model`,
): GeneratedHelpers.DefaultResponse<Description = "Success">;

namespace Parameters {
  namespace `Escaped-Model` {
    model `escaped-property` {
      @path `escaped-property`: string;
    }
  }
}
namespace GeneratedHelpers {
  @doc(Description)
  @error
  model DefaultResponse<
    Description extends valueof string = "",
    Body = void,
    Headers extends {} = {}
  > {
    @body body: Body;
    ...Headers;
  }
}
