import express from "express";

import multer = require("multer");
import getRawBody from "raw-body";
import * as stream from "stream";
import bodyParser = require("body-parser");
import clamav from "clamav.js";
import { RequestHandler } from "express-serve-static-core";
import { read } from "fs";

var upload = multer({
  storage: multer.memoryStorage()
});

export class Application {
  private app = express();

  version(): string {
    return "1.0";
  }

  start() {
    console.log("Application Started");
    this.app.disable('x-powered-by');
    this.app.get("/virus/version", function (req, res, next) {
      clamav.version(3310, '127.0.0.1', 1000, function (err, version) {
        if (err) {
          console.log('Version is not available[' + err + ']');
          next(err);
        }
        else {
          console.log('Version is [' + version + ']');
          res.send('Version is [' + version + ']');
        }
      })
    });
    this.app.get("/virus/ping", function (req, res, next) {
      clamav.ping(3310, '127.0.0.1', 1000, function (err) {
        if (err) {
          console.log('127.0.0.1:3310 is not available[' + err + ']');
          next(err);
        }
        else {
          console.log('ClamAV is alive');
          res.send('ClamAV is alive');
        }
      })
    });

    this.app.post("/virus/upload/multipart", upload.single("file"), function (
      req,
      res,
      next
    ) {
      const readStream = new stream.Readable();
      readStream.push(req.file.buffer);
      readStream.push(null);
      clamav
        .createScanner(3310, "127.0.0.1")
        .scan(readStream, function (err, object, malicious) {
          if (err) {
            console.log(object.path + ": " + err);
            next(err);
          } else if (malicious) {
            console.log(object.path + ": " + malicious + " FOUND");
            next(new Error(malicious + " FOUND"));
          } else {
            console.log(object.path + ": OK");
            res.send("OK");
          }
        });
    });

    this.app.use(bodyParser.raw({ type: 'application/octet-stream', limit: '25mb' }))
    this.app.post("/virus/upload/binary", function (
      req,
      res,
      next
    ) {
      const readStream = new stream.Readable();
      readStream.push(req.body);
      readStream.push(null);
      clamav
        .createScanner(3310, "127.0.0.1")
        .scan(readStream, function (err, object, malicious) {
          if (err) {
            console.log(object.path + ": " + err);
            next(err);
          } else if (malicious) {
            console.log(object.path + ": " + malicious + " FOUND");
            next(new Error("Virus Detected"));
          } else {
            console.log(object.path + ": OK");
            res.send("OK");
          }
        });
    });

    this.app.use(function (err, req, res, next) {
      if (err !== null) {
        console.log(err);
        res.send({ result: "fail", error: err.message });
      } else {
        next();
      }
    });

    this.app.listen(3000, function () {
      console.log("Server listening on port 3000");
    });
  }

  stop(): boolean {
    return true;
  }
}
