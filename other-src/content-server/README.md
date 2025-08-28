# Content Server and Workers

This directory contains the Content Server and associated workers.

## Getting Started

First of all, you need to set these environment variables,

```
export PINECONE_API_ENV=us-east-1
export PINECONE_API_KEY=YOUR_API_KEY
export OPENAI_API_KEY=YOUR_API_KEY
export NEXTAUTH_SECRET=YOUR_SECRET
export SUPABASE_PROJECT_URL=YOUR_PROJECT_URL
export SUPABASE_PROJECT_ANON_KEY=YOUR_ANON_KEY
```

Starting the web server,

```
yarn server
```

Starting the scrape worker,

```
yarn worker-scrape
```

Starting the indexing worker,

```
yarn worker-index
```

## Google Vertex AI

We need Google's Multimodal Embedding API to be enabled for your project.

[https://cloud.google.com/vertex-ai/generative-ai/docs/embeddings/get-multimodal-embeddings#aiplatform_sdk_text_image_embedding-python_vertex_ai_sdk](Getting Started With Google Cloud CLI)

```
import vertexai
from vertexai.vision_models import Image, MultiModalEmbeddingModel

# TODO(developer): Update & uncomment line below
# PROJECT_ID = "your-project-id"
vertexai.init(project=PROJECT_ID, location="us-central1")

model = MultiModalEmbeddingModel.from_pretrained("multimodalembedding@001")
image = Image.load_from_file(
    "gs://cloud-samples-data/vertex-ai/llm/prompts/landmark1.png"
)

embeddings = model.get_embeddings(
    image=image,
    contextual_text="Colosseum",
    dimension=1408,
)
print(f"Image Embedding: {embeddings.image_embedding}")
print(f"Text Embedding: {embeddings.text_embedding}")
```