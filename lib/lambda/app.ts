import * as express from "express";
import * as aws from "aws-sdk";
import * as cors from "cors";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    // "origin": "*",
    allowedHeaders:
      "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent",
  })
);

const CUSTOMER_TABLE = process.env.CUSTOMER_TABLE;

// ローカルで実行する際の設定
const dynamoOptions =
  process.env.NODE_ENV === "development"
    ? {
        region: "localhost",
        endpoint: "http://localhost:8000",
      }
    : { region: "ap-northeast-1" };
const documentClient = new aws.DynamoDB.DocumentClient(dynamoOptions);

/**
 * GET: /api/v1/message サンプル
 */
app.get("/api/v1/message", (req: express.Request, res: express.Response) => {
  res.send({ message: "Hello" });
});

/**
 * GET: /customer/:id ユーザー取得
 * @param id 取得対象ユーザーのIDを指定
 */
app.get("/customer/:id", (req: express.Request, res: express.Response) => {
  // app.get("/users/myprofile", (req, res) => {
  // 本来はtokenからlineIdを取得する
  documentClient
    .get({
      TableName: CUSTOMER_TABLE,
      Key: {
        id: req.params.id,
      },
    })
    .promise()
    .then((result) => {
      if (result.Item == undefined) {
        res.status(404).json({ message: "not found" });
      } else {
        res.json(result.Item);
      }
    })
    .catch((e) => res.status(422).json({ errors: e }));
});

/**
 * POST: /users ユーザー作成API
 * @param {req.body} { id: id, nickname: ニックネーム, }
 */
app.post("/customer", (req: express.Request, res: express.Response) => {
  const { id, name } = req.body;
  documentClient
    .put({
      TableName: CUSTOMER_TABLE,
      Item: {
        id: id,
        name: name,
      },
    })
    .promise()
    .then((result) => res.json(result))
    .catch((e) => res.status(422).json({ errors: e }));
});

export default app;
