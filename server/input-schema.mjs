export const inputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["network", "boost_edge", "boost", "closed_edges"],
  properties: {
    network: { type: "string", enum: ["delta", "loop", "cascade"] },
    boost_edge: {
      type: "string",
      enum: ["e1", "e2", "e3", "e4", "e5", "e6", "e7", "e8"],
    },
    boost: { type: "integer", minimum: 0, maximum: 8 },
    closed_edges: {
      type: "array",
      uniqueItems: true,
      maxItems: 8,
      items: {
        type: "string",
        enum: ["e1", "e2", "e3", "e4", "e5", "e6", "e7", "e8"],
      },
    },
  },
};
