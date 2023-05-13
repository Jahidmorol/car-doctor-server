const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const port = process.env.PORT || 5000;
require("dotenv").config();

// midleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.USER_DB}:${process.env.PASS_DB}@cluster0.bu34nfl.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyJWT = (req, res, next) => {
  // console.log('hiting verifyJWT',req.headers.authorization);
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.JWT_PRIVATE_KEY, (err, decoded) => {
    // console.log('jahid::::.....',decoded);
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db("carDoctors").collection("services");
    const checkOutCollection = client.db("carDoctors").collection("checkouts");

    // ----------------> jwt <-------------------
    app.post("/jwt", (req, res) => {
      const user = req.body;
      // console.log(user);

      const token = jwt.sign(user, process.env.JWT_PRIVATE_KEY, {
        expiresIn: "1h",
      });
      // console.log(token);
      res.send({ token });
    });

    // ---------------allservice --------------
    app.get("/services", async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
      // console.log(result);
    });

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        projection: { img: 1, title: 1, img: 1, price: 1 },
      };
      const result = await serviceCollection.findOne(query, options);
      res.send(result);
    });

    //---------------- checkOut ------------
    app.post("/checkout", async (req, res) => {
      const order = req.body;
      // console.log(order);
      const result = await checkOutCollection.insertOne(order);
      res.send(result);
    });

    // ---------------orederReviews------------
    app.get("/orderreviews", verifyJWT, async (req, res) => {
      // console.log(req.query.email);

      // console.log('after rerifyJWT',req.decoded);
      if(req.decoded.email !== req.query?.email){
        return res.status(403).send({error: true, message: 'forbidden access'})
      }

      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await checkOutCollection.find(query).toArray();
      res.send(result);
    });

    
    app.patch("/orderreviews/:id", async (req, res) => {
      const id = req.params.id;
      const body = req.body;
      const filter = { _id: new ObjectId(id) };
      const approvedStatus = {
        $set: {
          status: body.status,
        },
      };
      const result = await checkOutCollection.updateOne(filter, approvedStatus);
      res.send(result);
    });

    app.delete("/orderreviews/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await checkOutCollection.deleteOne(query);
      res.send(result);
    });

    // -----------------------------------------------

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("car doctor is running");
});

app.listen(port, () => {
  console.log(`car doctor is running port ${port}`);
});
