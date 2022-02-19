// Load up dependencies
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
// Path to proto file
const PROTO_FILE = "./service_def.proto";

// Options needed for loading Proto file
const options = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};

// Load Proto File
const pkgDefs = protoLoader.loadSync(PROTO_FILE, options);
// Load Definition into gRPC
const DogService = grpc.loadPackageDefinition(pkgDefs).DogService;

// Create the Client
const client = new DogService(
  "localhost:3500",
  grpc.credentials.createInsecure()
);

// make a call to GetDog
client.GetDog({}, (error, dog) => {
  if (error) {
    console.log(error);
  } else {
    console.log(dog);
  }
});
