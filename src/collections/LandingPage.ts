import type { CollectionConfig } from "payload";

export const LandingPage: CollectionConfig = {
  slug: "landingPage",
  labels: {
    singular: "Landing Page",
    plural: "Landing Pages",
  },
  admin: {
    useAsTitle: "title",
  },
  access: {
  read: () => true,
  create: ({ req }) => !!req.user,
  update: ({ req }) => !!req.user,
  delete: ({ req }) => !!req.user,
},

  fields: [
    {
      name: "title",
      type: "text",
      required: true,
      admin: {
        description: "Internal title for admin reference",
      },
    },

    {
      name: "hero",
      type: "group",
      fields: [
        { name: "title", type: "text", required: true },
        { name: "subtitle", type: "textarea", required: true },
        { name: "description", type: "textarea", required: true },
        { name: "image", type: "upload", relationTo: "media"},
         {
          name: "primaryCTA",
          type: "group",
          fields: [
            { name: "label", type: "text", required: true },
            { name: "url", type: "text", required: true },
          ],
        },
        {
          name: "secondaryCTA",
          type: "group",
          fields: [
            { name: "label", type: "text" },
            { name: "url", type: "text" },
          ],
        },
      ],
    },

   {
  name: "about",
  type: "group",
  label: "Mål",
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
      label: "Tittel (quote)"
    },
    {
      name: "content",
      type: "textarea",
      required: true,
      label: "Innhold"
    },

    {
      name: "utfordringer",
      type: "array",
      label: "Utfordringer (barnet står i midten)",
      fields: [
        { name: "title", type: "text", required: true, label: "Tittel" },
        {
          name: "description",
          type: "textarea",
          required: true,
          label: "Beskrivelse"
        },

      ],
    },

    {
      name: "prinsipper",
      type: "array",
      label: "Prinsipper",
      fields: [
        { name: "title", type: "text", required: true, label: "Tittel" },
        {
          name: "description",
          type: "textarea",
          required: true,
          label: "Beskrivelse"
        },
      ],
    },
  ],
},

    {
      name: "howItWorks",
      type: "group",
      label: "How It Works",
      fields: [
        { name: "title", type: "text", required: true },
        {
          name: "steps",
          type: "array",
            
          fields: [
            { name: "title", type: "text", required: true },
            { name: "description", type: "textarea", required: true },
          ],
        },
      ],
    },
{
  name: "features",
  type: "group",
  label: "What Makes Samsam Different",
  fields: [
    { name: "title", type: "text", required: true },
    { name: "intro", type: "textarea" },

    {
      name: "image",
      type: "upload",
      relationTo: "media",
      required: false,
    },

    {
      name: "items",
      type: "array",
      fields: [
        { name: "featureTitle", type: "text", required: true },
        { name: "description", type: "textarea", required: true },
      ],
    },
  ],

  },
    {
  name: "whySamsam",
  type: "group",
  label: "Why Samsam",
 fields: [
        { name: "title", type: "text", required: true },
        { name: "description", type: "textarea", required: true },

        { name: "image", type: "upload", relationTo: "media" }, 

        {
          name: "reasons",
          type: "array",
          fields: [
            { name: "title", type: "text", required: true },
            { name: "description", type: "textarea" },
          ],
        },

      ],
    },
    

    {
      name: "faq",
      type: "group",
      label: "FAQ",
      fields: [
        { name: "title", type: "text", required: true },

        {
          name: "items",
          type: "array",
          label: "FAQ items",
          minRows: 3,
          fields: [
            { name: "question", type: "text", required: true },
            { name: "answer", type: "textarea", required: true },
          ],
        },
      ],
    },


    
  {
  name: "finalCTA",
  type: "group",
  label: "Final CTA Section",
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
    },
    {
      name: "description",
      type: "textarea",
      required: true,
    },
    {
      name: "primaryButton",
      type: "group",
      fields: [
        { name: "label", type: "text", required: true },
        { name: "url", type: "text", required: true },
      ],
    },
    {
      name: "secondaryButton",
      type: "group",
      fields: [
        { name: "label", type: "text" },
        { name: "url", type: "text" },
      ],
    },
  ],
},
   
  ],
};

