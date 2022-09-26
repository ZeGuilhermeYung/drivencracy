import express, { json } from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from "mongodb";
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

server.post("/choice", async (req, res) => {
  const { title, pollId } = req.body;

  const postChoiceSchema = joi.object({
    title: joi.string().required(),
    pollId: joi.string().required(),
  });

  const validation = postChoiceSchema.validate({ title, pollId }, { abortEarly: false });
  
  if (validation.error) {
    res.status(422).send("A opção de votação não pode ser vazia.");
    return;
  }

  try {
    const poll = await db.collection("poll").findOne({ _id: ObjectId(pollId) });

    const choices = await db.collection("choice").find({
      pollId: ObjectId(pollId)
    }).toArray();

    const matchedTitle = choices.find((choice) => choice.title === title);

    if (!poll) {
      res.status(404).send("Opção de enquete inexistente.");
      return;
    }
    if (matchedTitle) {
      res.status(409).send("Opção de votação já existente.");
      return;
    }
    if (dayjs(poll.expireAt).valueOf() < Date.now()) {
      res.status(403).send("Data de enquete já expirada.");
      return;
    }

    await db.collection("choice").insertOne({
      title,
      pollId: ObjectId(pollId)
    });
    res.sendStatus(201);

  } catch (error) {
    console.error(error);
    res.status(500).send("Requisição incompleta, verifique os dados enviados");
  }
});


server.listen(5000);