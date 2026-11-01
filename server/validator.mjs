import { inputSchema } from "./input-schema.mjs";
import { fail } from "./errors.mjs";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
function convert(s) {
  if (s.enum) return Type.Union(s.enum.map((x) => Type.Literal(x)));
  if (s.type === "object")
    return Type.Object(
      Object.fromEntries(
        Object.entries(s.properties).map(([k, v]) => [k, convert(v)]),
      ),
      { additionalProperties: false },
    );
  if (s.type === "array")
    return Type.Array(convert(s.items), {
      minItems: s.minItems,
      maxItems: s.maxItems,
      uniqueItems: s.uniqueItems,
    });
  if (s.type === "boolean") return Type.Boolean();
  if (s.type === "string")
    return Type.String({
      minLength: s.minLength,
      maxLength: s.maxLength,
      pattern: s.pattern,
    });
  return (s.type === "integer" ? Type.Integer : Type.Number)({
    minimum: s.minimum,
    maximum: s.maximum,
  });
}
const schema = convert(inputSchema);
export function validateInput(input) {
  if (!Value.Check(schema, input))
    fail("invalid_input", "Confira tipos, limites e campos da rede.");
  return input;
}
