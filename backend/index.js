const express = require("express");
require("dotenv").config();
const app = express();
const UAParser = require("ua-parser-js");
const cors = require("cors");
const bodyParser = require("body-parser");
const { MongoClient } = require("mongodb");
const sgMail = require("@sendgrid/mail");
const client1 = require("twilio")(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: ["http://localhost:3000", "https://twitter-seven-puce.vercel.app"],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  })
);
// Helper function to check if current time is within allowed timeframe
function isWithinTimeframe(startHour, endHour) {
  const currentTime = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Kolkata",
  });
  const currentHour = new Date(currentTime).getHours();
  return currentHour >= startHour && currentHour < endHour;
}
// Apply the middleware to all routes or specific routes
app.use(enforceMobileTimeRestrictions);

// Middleware to enforce time restrictions for mobile devices
function enforceMobileTimeRestrictions(req, res, next) {
  const userAgent = req.headers["user-agent"];
  const parser = new UAParser(userAgent);
  const { device } = parser.getResult();

  // console.log("User Agent:", userAgent);
  // console.log("Device Type:", device.type);

  if (device.type === "mobile") {
    const isAllowedTime = isWithinTimeframe(10, 13); // 10 AM to 1 PM IST
    // console.log("Is Allowed Time:", isAllowedTime);
    if (!isAllowedTime) {
      return res.status(403).send({
        error:
          "Access is restricted for mobile devices outside of 10 AM to 1 PM IST",
      });
    }
  }

  next();
}

app.options("*", cors());

app.use(express.json());
app.use(bodyParser.json());

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const loginHistoryCollection = client
      .db("database")
      .collection("Login History");
    const postCollection = client.db("database").collection("posts");
    const userCollection = client.db("database").collection("users");
    const audioCollection = client.db("database").collection("audios");

    // get
    // Backend code to fetch login history
    app.get("/loginHistory/:email", async (req, res) => {
      const { email } = req.params;

      try {
        const loginHistory = (
          await loginHistoryCollection.find({ email }).toArray()
        ).reverse();
        res.json(loginHistory);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch login history" });
      }
    });
    app.get("/phoneHistory/:phoneNumber", async (req, res) => {
      const { phoneNumber } = req.params;
      try {
        const loginHistory = (
          await loginHistoryCollection.find({ phoneNumber }).toArray()
        ).reverse();
        res.json(loginHistory);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch login history" });
      }
    });

    app.get("/user", async (req, res) => {
      const user = await userCollection.find().toArray();
      res.send(user);
    });
    app.get("/loggedInUser", async (req, res) => {
      try {
        const { email, phoneNumber } = req.query;

        // Ensure only one of email or phoneNumber is provided
        if ((email && phoneNumber) || (!email && !phoneNumber)) {
          return res.status(400).json({
            error: "Provide either email or phone number, but not both.",
          });
        }

        // Prepare the query based on the provided parameter
        const query = email ? { email } : { phoneNumber };

        // Fetch the user from the database
        const users = await userCollection.find(query).toArray();

        if (users.length === 0) {
          return res.status(404).json({ message: "User not found" });
        }

        res.json(users[0]); // Return the single user object
      } catch (error) {
        console.error("Error fetching logged-in user:", error.message);
        res.status(500).json({ error: "Failed to fetch logged-in user" });
      }
    });

    app.get("/post", async (req, res) => {
      const post = (await postCollection.find().toArray()).reverse();
      res.send(post);
    });
    app.get("/userPost", async (req, res) => {
      const email = req.query.email;
      const post = (
        await postCollection.find({ email: email }).toArray()
      ).reverse();
      res.send(post);
    });
    app.get("/record", async (req, res) => {
      const records = (await audioCollection.find().toArray()).reverse();
      res.send(records);
    });
    // post
    app.post("/register", async (req, res) => {
      const { email, phoneNumber, ...userData } = req.body;

      // Ensure only one of email or phoneNumber is provided
      if ((email && phoneNumber) || (!email && !phoneNumber)) {
        return res
          .status(400)
          .json({
            error: "Provide either email or phone number, but not both.",
          });
      }

      try {
        const existingUser = await userCollection.findOne({
          $or: [{ email }, { phoneNumber }],
        });

        if (existingUser) {
          return res
            .status(400)
            .json({
              error:
                "User already exists with the provided email or phone number.",
            });
        }

        const result = await userCollection.insertOne({
          email,
          phoneNumber,
          ...userData,
        });
        res.send(result);
      } catch (error) {
        console.error("Error registering user:", error.message);
        res.status(500).json({ error: "Failed to register user" });
      }
    });

    app.post("/checkUser", async (req, res) => {
      const { phoneNumber } = req.body;

      try {
        const user = await userCollection.findOne({ phoneNumber });

        if (user) {
          res.json({
            exists: true,
            username: user.username,
            fullName: user.fullName,
          });
        } else {
          res.json({ exists: false });
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });
    //POSTS
    app.post("/post", async (req, res) => {
      try {
        const { email, post, photo, audio } = req.body;

        const newPost = {
          email,
          post,
          photo,
          audio,
        };
        const postResult = await postCollection.insertOne(newPost);

        res.send({
          message: "Post created successfully!",
          postId: postResult.insertedId,
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Error creating post" });
      }
    });
    app.post("/loginHistory", async (req, res) => {
      try {
        const { email } = req.body.systemInfo;

        const ipAddress = await axios.get("https://api.ipify.org?format=json");
        const userAgent = req.headers["user-agent"];
        const parser = new UAParser(userAgent);
        const { browser, os, device } = parser.getResult();

        if (browser.name === "Chrome") {
          const { email } = req.body;

          try {
            const otp = Math.floor(Math.random() * 9000 + 1000).toString();
            otpStore[email] = { otp, createdAt: new Date() };

            const msg = {
              to: email,
              from: process.env.SENDGRID_EMAIL,
              subject: "Your OTP Code",
              text: `Your OTP code is ${otp}`,
            };

            await sgMail.send(msg);

            res.status(200).send({ message: "OTP sent to your email" });
          } catch (error) {
            console.error(
              "Error sending email:",
              error.response ? error.response.body : error.message
            );
            res.status(500).send({ error: "Error sending OTP" });
          }
        }

        const loginHistory = {
          email,
          ip: ipAddress.data.ip,
          browser: `${browser.name} ${browser.version}`,
          os: `${os.name} ${os.version}`,
          device: device.type || "Desktop",
          timestamp: new Date(),
        };

        const result = await loginHistoryCollection.insertOne(loginHistory);
        res.send(result);
      } catch (error) {
        console.error("Error storing login history:", error.message);
        res.status(500).send({ error: "Failed to store login history" });
      }
    });
    app.post("/phoneHistory", async (req, res) => {
      try {
        // Extract login information from the request body
        const { phoneNumber } = req.body;
        const ipAddress = await axios.get("https://api.ipify.org?format=json");
        const userAgent = req.headers["user-agent"];
        const parser = new UAParser(userAgent);
        const { browser, os, device } = parser.getResult();

        // Create login history object
        const loginHistory = {
          phoneNumber,
          ip: ipAddress.data.ip,
          browser: `${browser.name} ${browser.version}`,
          os: `${os.name} ${os.version}`,
          device: device.type || "Desktop",
          timestamp: new Date(),
        };

        const result = await loginHistoryCollection.insertOne(loginHistory);

        res
          .status(201)
          .json({ message: "Login history captured successfully", result });
      } catch (error) {
        console.error("Error storing login history:", error.message);
        res.status(500).send({ error: "Failed to store login history" });
      }
    });

    // patch
    app.patch("/userUpdates", async (req, res) => {
      const { email, phoneNumber, ...profile } = req.body;

      const filter = email ? { email } : { phoneNumber };

      const options = { upsert: true };
      const updateDoc = { $set: profile };

      try {
        const result = await userCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        res.send(result);
      } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    //OTPs EMAIL AND MOBILE NUMBER
    const otpStore = {};
    // Email OTPs

    app.post("/send-email-otp", async (req, res) => {
      const { email } = req.body;

      try {
        const otp = Math.floor(Math.random() * 9000 + 1000).toString();
        otpStore[email] = { otp, createdAt: new Date() };

        const msg = {
          to: email,
          from: process.env.SENDGRID_EMAIL,
          subject: "Your OTP Code",
          text: `Your OTP code is ${otp}`,
        };

        await sgMail.send(msg);

        res.status(200).send({ message: "OTP sent to your email" });
      } catch (error) {
        console.error(
          "Error sending email:",
          error.response ? error.response.body : error.message
        );
        res.status(500).send({ error: "Error sending OTP" });
      }
    });

    // SMS OTPs
    app.post("/send-sms-otp", async (req, res) => {
      const { phoneNumber } = req.body;

      try {
        const otp = Math.floor(Math.random() * 9000 + 1000).toString();
        otpStore[phoneNumber] = { otp, createdAt: new Date() };
        await client1.messages.create({
          body: `Your OTP code is ${otp}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phoneNumber,
        });

        res.status(200).send({ message: "OTP sent to your mobile number" });
      } catch (error) {
        console.error("Error sending SMS:", error.message);
        res.status(500).send({ error: "Error sending OTP" });
      }
    });

    // Verify Email OTP
    app.post("/verify-email-otp", async (req, res) => {
      const { email, otp } = req.body;

      if (!email || !otp || otp.length !== 4)
        return res
          .status(400)
          .send({ error: "Email and a 4-digit OTP are required" });

      try {
        const storedOtp = otpStore[email];
        if (!storedOtp || storedOtp.otp !== otp.trim())
          return res.status(400).send({ error: "Invalid OTP" });

        const otpExpiry = 5 * 60 * 1000;
        if (Date.now() - new Date(storedOtp.createdAt).getTime() > otpExpiry)
          return res.status(400).send({ error: "OTP expired" });

        delete otpStore[email];
        res.status(200).send({ message: "Email OTP verified successfully" });
      } catch (error) {
        console.error("Error verifying OTP:", error.message);
        res.status(500).send({ error: "Error verifying OTP" });
      }
    });

    // Verify SMS OTP

    app.post("/verify-sms-otp", async (req, res) => {
      const { phoneNumber, otp } = req.body;

      if (!phoneNumber || !otp || otp.length !== 4)
        return res
          .status(400)
          .send({ error: "Phone number and a 4-digit OTP are required" });

      try {
        const storedOtp = otpStore[phoneNumber];
        if (!storedOtp || storedOtp.otp !== otp.trim())
          return res.status(400).send({ error: "Invalid OTP" });

        const otpExpiry = 5 * 60 * 1000;
        if (Date.now() - new Date(storedOtp.createdAt).getTime() > otpExpiry)
          return res.status(400).send({ error: "OTP expired" });

        delete otpStore[phoneNumber];
        res.status(200).send({ message: "SMS OTP verified successfully" });
      } catch (error) {
        console.error("Error verifying OTP:", error.message);
        res.status(500).send({ error: "Error verifying OTP" });
      }
    });
  } finally {
    // Ensure the client will close when you finish/error
    // await client.close(); (Don't close it if you want to keep the server running)
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
