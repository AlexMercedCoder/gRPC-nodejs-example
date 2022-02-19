# Making a Service with gRPC and NodeJS (The World of Protocols)

## The World of Protocols

A protocol is just a standard that makes it easier for different parties of a transaction to expect the same thing and get it done correctly. No one needs to know the entire protocol, just the part that pertains to them.

For example, if I need to send someone a letter I know the expected behavior is for me to put it in an envelope with proper postage and to drop it off at a post office and I can expect the letter will arrive at its destination. What happens in between (the implementation details) I don't need to know to properly send a letter while all the post-office workers do know that part of the protocol.

In communicating between computers we have several different protocols that enable us to many of the things we do everyday.

- **tcp (transmission control protocol)** this protocol defines how computers can indentify and send each other text messages at the most root level.

With tcp our computers can send messages back and forth but if I have no idea what structure that message will take I can't really write software to handle it so many higher level protocols define how messages should be structured, most famously the hyper text transfer protocol (HTTP).

So when most of your software communicates to each other via the internet they use http messages that look like this:

```
GET /tutorial.htm HTTP/1.1
User-Agent: Mozilla/4.0 (compatible; MSIE5.01; Windows NT)
Host: www.devnursery.com
Accept-Language: en-us
Accept-Encoding: gzip, deflate
Connection: Keep-Alive
```

You probably never manually wrote an HTTP message like the above before and that's because internet browsers are designed to handle that for us, but because there is a protocol the software can be created and work reliably. If you've written web servers you usually don't worry about the above messages either cause most programming languages have web framework that already are designed to breakdown these http messages, what a wonderful world.

## API Protocols

When it comes to creating APIs so our applications can talk to each other (one level higher than computer talking) we need protocols as well. Yes they can send each other messages in a standard format with tcp & http, but a higher level protocol is needed for the application level and there are many options.

Let's imagine we are creating a service where a server on the internet can receive and request and return the name of a dog the server has stored (impractical, but will help us make the point.)

### REST (Representational State Transfer)

In REST we take each action our service should have available and make it triggered by a particular request to a particular url. For example using the ExpressJS web framework you may see something like this.

```js

app.get("/dog", (request, response) => {
    response.json({name: "Spot", age: 6})
})

```

So based on the above rest endpoint if someone makes an http request to /dog (somewebsite.com/dog) the above route would be triggered responding with the dogs data.

This is by far the most common and popular way to create an API but as a service gets more and more complex the list of of URL can get quite long and it's up to the developers to create the documentation to make the API usuable to consumer, although tools like Swagger (auto generates documentation) make this part easier.

### GraphQL

Facebook developed their own protocol that has grown in popularity called graphQL, and the way it works is there is only one url that all requests are sent to:

For example: `somewebsite.com/graphql`

All requests made to this url are http POST requests, but the big difference is these requests in their body have a string that defines what the consumer is looking for.

```graphql
query {
    getDog {
        name
        age
    }
}
```

The above graphQL query would tell the server I want to run a query called getDog and of the data that query returns I only want the name and age.

The server would then search through all the defined queries (for getting data) and mutation (for creating, updating and deleting data) to see if there is match and process the query.

Benefits:
- One url for making requests
- Queries allow you to define which data you want back
- Auto-generates documentation

Cons:
- Must write type definitions when creating api

### RPC (Remove Procedure Call)

RPC is an approach where you define certain services a server has available and messages (types of data) services need to receive or that they return. In this regard it is very similar to defining GraphQL types but the big different is in the consumers experience. Instead of writing http request or queries in a special language they write function calls that look writing normal function calls.

```js

client.getDog({}, (error, dog) => {
    if (error){
        console.log(error)
    } else {
        console.log(dog)
    }
})

```

The above is how an RPC call using the gRPC framework would look like. We would of course need documentation to know which services are available from the RPC server. The beauty of RPC for defining an API is the type definitions are independant of the language implementation using something called protobuff. You can define all the services and message independantly and different servers and clients can implement it as needed.

This is why [Apache Arrow Flight](https://www.dremio.com/subsurface/an-introduction-to-apache-arrow-flight-sql/) (a new standard for connecting to databases) chose RPC for their API, they can create a standard definition then different databases that would act as a server can implement the details on how those services would work for their particular system but for clients the experience will feel the same regardless of the database they use Arrow Flight to connect to.

## Creating an RPC API with gRPC and Nodejs

(must have NodeJS installed)

- open up your terminal to an empty folder you can work out of

- create a new node project `npm init -y`

- Install our depedencies

```
npm install @grpc/grpc-js @grpc/proto-loader
```

- create three files `touch server.js client.js service_def.proto`

### service_def.proto

Proto files are how we define our service (the functions the client call) and the messages (the data types that are either received or returned by services). The beauty is the proto files are language agnostic so someone can take the same proto file and then implement it using Go, Rust, Python, Java and so forth without having to make any changes to the proto file.

[Proto3 Syntax Docs](https://developers.google.com/protocol-buffers/docs/proto3)

```proto
syntax = "proto3";

message Empty {}

message Dog {
    string name = 1;
    int32 age = 2;
}

service DogService {
    rpc GetDog (Empty) returns (Dog) {}
}
```

So have defined there is a type of data called Dog with two fields, name and age (fields must be numbered). The DogService is a collection of signatures of the different actions this service has available and what they need to receive (Empty equals an empty object) and what it will return in response (a Dog).

That's it, now anyone can use that proto file to implement this service, but let's make an implementation ourselves.

### Server.js

Now let's implement the service defined in our proto file. We will:

- load up our dependencies
- load up the proto file
- define the implmentation of the DogService and its GetDog procedure

```js
// Load dependencies
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

// Path to our proto file
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
const dogProto = grpc.loadPackageDefinition(pkgDefs);
// Create gRPC server
const server = new grpc.Server();

// Implement DogService
server.addService(dogProto.DogService.service, {
  // Implment GetDog
  GetDog: (input, callback) => {
    try {
      callback(null, { name: "Spot", age: 5 });
    } catch (error) {
      callback(error, null);
    }
  },
});

// Start the Server
server.bindAsync(
  // Port to serve on
  "127.0.0.1:3500",
  // authentication settings
  grpc.ServerCredentials.createInsecure(),
  //server start callback
  (error, port) => {
    console.log(`listening on port ${port}`);
    server.start();
  }
);
```

So now we can run the server with `node server.js` and the server should be listening for requests. Now we will define a client to make a request to the server.

### client.js

In this file we will:

- load up our dependencies
- create our client
- make a request to the GetDog Procedure

```js
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
```

That's it. To reiterate the benefit of this approach is you can have one definition of a service (the proto file), which can be implemented many times but work with the same client since all server implmentations are bound by the protofile.

So in the case of Apache Arrow, instead of having to create different a different client library for each type of database in each language, each database can implement a server of the [Apache Arrow Flight service](https://arrow.apache.org/docs/format/Flight.html) and one client can be created per language that'll work with all databases, how cool is that!

[The Code From This Tutorial](https://github.com/AlexMercedCoder/gRPC-nodejs-example)