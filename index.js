const express = require('express');
const speakeasy = require('speakeasy');
const uuid = require('uuid');

const { JsonDB } = require('node-json-db');
const { Config } = require('node-json-db/dist/lib/JsonDBConfig');

const app = express();
app.use(express.json());

const db = new JsonDB(new Config('2faDB', true, false, '/'));

// Test route
app.get('/api', (req, res) => res.json({message: "2fa authentication"}));

// Register user & create temp secret
app.post('/api/register', (req, res) => {
  const id = uuid.v4();

  try {
    const path = `/user/${id}`;
    const tempSecret = speakeasy.generateSecret();
    db.push(path, { id, tempSecret });
    res.json({id, secret: tempSecret.base32 });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error creating document in database" });
    
  }
});

// Verify token and make secret perm
app.post('/api/verify', (req, res) => {
  const { token, userId } = req.body;

  try {
    const path = `/user/${userId}`;
    const user = db.getData(path);

    const { base32:secret } = user.tempSecret;

    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token
      });

    if(verified) {
      db.push(path, { id: userId, secret: user.tempSecret });
      res.json({ verified: true });
    } else {
      res.json({ verified: false });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error retrieving user'});
  }
})



const PORT = process.env.PORT || 5000; 

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`))