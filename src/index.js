import express, { json } from 'express';
import cors from 'cors';
import { MongoClient } from "mongodb";
import dotenv from 'dotenv';
import joi from "joi";
import dayjs from 'dayjs';
dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

const server = express();
server.use(cors());
server.use(json());

(async () => {
  try {
      await mongoClient.connect();
      db = mongoClient.db("antiBozo");
  } catch (error) {
      console.error(error);
  }
})();

server.post("/poll", async (req, res) => {
  
  const { title, expireAt } = req.body;

  const postPollSchema = joi.object({
    title: joi.string().required(),
    expireAt: joi.string().allow("").required(),
  });

  const validation = postPollSchema.validate({ title, expireAt }, { abortEarly: false });
  let newExpirationDate = "";

  if (validation.error) {
    res.status(422).send("O título da enquete não pode ser vazio");
    return;
  }
  if (!expireAt) {
    newExpirationDate = dayjs(Date.now()).add(30, 'day').format("YYYY-MM-DD HH:mm");
  } else {
    newExpirationDate = expireAt;
  }
  try {
    await db.collection("poll").insertOne({
      title: title,
      expireAt: newExpirationDate
    });
    res.sendStatus(201);

  } catch (error) {
    console.error(error);
    res.status(500).send("Requisição incompleta, verifique os dados enviados");
  }
});

server.get("/poll", async (req, res) => {
  try {
    const polls = await db.collection("poll").find().toArray();
    res.send(polls);

  } catch (error) {
    console.error(error);
    res.status(500).send("Resposta incompleta, verifique os dados solicitados");
  }
});

server.listen(5000);