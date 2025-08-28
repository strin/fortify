const aiplatform = require("@google-cloud/aiplatform");
const fs = require("fs");

const project = "round-core-438723-a7";
const modelLocation = "us-west1-c";
const baseImagePath =
  "/Users/timshi/Desktop/persona/13_anna_malygon/content/lake.png";

// Imports the Google Cloud Prediction service client
const { PredictionServiceClient } = aiplatform.v1;

// Import the helper module for converting arbitrary protobuf.Value objects.
const { helpers } = aiplatform;

// Specifies the location of the api endpoint
const clientOptions = {
  apiEndpoint: "us-central1-aiplatform.googleapis.com",
};
const publisher = "google";
const model = "multimodalembedding@001";

// Instantiates a client
const predictionServiceClient = new PredictionServiceClient(clientOptions);

async function predictImageFromImageAndText() {
  // Configure the parent resource
  const endpoint = `projects/${project}/locations/${modelLocation}/publishers/${publisher}/models/${model}`;

  const imageFile = fs.readFileSync(baseImagePath);
  // Convert the image data to a base64 encoded string
  const encodedImage = imageFile.toString("base64");

  const prompt = {
    image: {
      bytesBase64Encoded: encodedImage,
    },
  };
  const instanceValue = helpers.toValue(prompt);
  const instances = [instanceValue];

  const parameter = {
    sampleCount: 1,
  };
  const parameters = helpers.toValue(parameter);

  const request = {
    endpoint,
    instances,
    parameters,
  };

  // Predict request
  const [response] = await predictionServiceClient.predict(request);
  console.log("Get image embedding response");
  const predictions = response.predictions;
  console.log("\tPredictions :");
  for (const prediction of predictions) {
    const imageEmbedding =
      prediction.structValue.fields.imageEmbedding.listValue.values.map(
        (value: any) => value.numberValue
      );
    console.log(`\t\timage embedding: ${JSON.stringify(imageEmbedding)}`);
  }
}

// wrap the await call in an async function
async function main() {
  await predictImageFromImageAndText();
}

// call the main function
main().catch(console.error);
