import type { CollectionConfig } from "payload";

export const AboutPage: CollectionConfig = {
  slug: "aboutPage",
  fields: [
    { name: "title", type: "text", required: true },

    {
      name: "hero",
      type: "group",
      fields: [
        { name: "title", type: "text", required: true },
        { name: "subtitle", type: "textarea", required: true },
        { name: "image", type: "upload", relationTo: "media" },
      ],
    },

    {
      name: "intro",
      type: "group",
      fields: [
        { name: "title", type: "text", required: true },
        { name: "content", type: "textarea", required: true },
      ],
    },

    {
      name: "missionVision",
      type: "group",
      fields: [
        { name: "missionTitle", type: "text", required: true },
        { name: "missionText", type: "textarea", required: true },
        { name: "visionTitle", type: "text", required: true },
        { name: "visionText", type: "textarea", required: true },
      ],
    },

    {
      name: "values",
      type: "group",
      fields: [
        { name: "title", type: "text", required: true },
        {
          name: "items",
          type: "array",
          fields: [
            { name: "title", type: "text", required: true },
            { name: "description", type: "textarea", required: true },
          ],
        },
      ],
    },

    {
      name: "story",
      type: "group",
      fields: [
        { name: "title", type: "text", required: true },
        { name: "content", type: "textarea", required: true },
      ],
    },

    {
      name: "commitment",
      type: "group",
      fields: [
        { name: "title", type: "text", required: true },
        {
          name: "items",
          type: "array",
          fields: [{ name: "text", type: "text", required: true }],
        },
      ],
    },

    {
      name: "cta",
      type: "group",
      fields: [
        { name: "title", type: "text", required: true },
        { name: "text", type: "textarea", required: true },
        {
          name: "button",
          type: "group",
          fields: [
            { name: "label", type: "text", required: true },
            { name: "url", type: "text", required: true },
          ],
        },
      ],
    },
  ],
};