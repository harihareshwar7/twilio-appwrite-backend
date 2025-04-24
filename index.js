const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, child } = require('firebase/database');
const { Client, Users, Messaging, ID } = require('node-appwrite');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());

const firebaseConfig = {
  databaseURL: 'https://mannmathi-2d8c5-default-rtdb.firebaseio.com/'
};


const appFB = initializeApp(firebaseConfig, 'publicApp');
const db = getDatabase(appFB);

// Initialize the Appwrite client
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID || '67e1226500136a06098b')
  .setKey(process.env.APPWRITE_API_KEY || 'standard_115bb59b63c9e606d6760e5bd5f635c52b29136f6de1d53d341b3438cfc6811c39e796b134d86a27d564136eba698d57fdbe710ec7b7f3dfc4cdab37aeb2997b2e6bc21b048a2773219559cc9940b25bcac3852bb9838f5c4e406401b50c1a42f7d324f34f92368a5f674806e6a0eb2e3a13d4048f5ae9076185cf319f293c96');

// Initialize the Users and Messaging services
const users = new Users(client);
const messaging = new Messaging(client);

async function createOrGetUser(phoneNumber) {
    try {
      // Step 1: List users and filter by phone
      const userList = await users.list();

      const existingUser = userList.users.find(user => user.phone === phoneNumber);

      if (existingUser) {
        console.log('✅ User already exists:', existingUser.$id);
        return existingUser;
      }

      // Step 2: Create new user if not exists
      const newUser = await users.create(ID.unique(), null, phoneNumber);
      console.log('✅ New user created:', newUser.$id);
      return newUser;

    } catch (err) {
      console.error('User check/create failed:', err.message);
      throw err;
    }
  }

app.get('/', (req, res) => {
  res.send('Twilio Keypad Backend is running!');
});

app.get('/api/data', async (req, res) => {
  try {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, '/sensor_data'));
    if (snapshot.exists()) {
      res.json(snapshot.val());
    } else {
      res.status(404).json({ error: 'No data found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data from Firebase', details: error.message });
  }
});



  // Replace with the phone number you want to send an SMS to

app.post('/api/create-user-and-send', async (req, res) => {
    const phoneNumber = '+919952597230';
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    try {
        // Step 1: Create a user (if not already created)
        const user = await createOrGetUser(phoneNumber);
         console.log('User:', user.$createdAt,user.phone,user.targets[0].$id);
         const target = user.targets[0];
        const dbRef = ref(db);
        let data;
        const snapshot = await get(child(dbRef, '/sensor_data'));
        if (snapshot.exists()) {
           data = snapshot.val();
        } else {
          throw new Error('No data found');
        }

        if (!data) {
          throw new Error('Failed to fetch data for the message');
        }

        // Prepare the message content
        const messageContent = `Sensor Data: ${JSON.stringify(data)}`;

        // Send the SMS
        const sms = await messaging.createSms(
           ID.unique(),
          messageContent,
          [],
          [],
      [target.$id],

        );


        console.log('SMS sent successfully:', sms);

        // Step 2: Create a phone target for the user
          res.json({ message: 'User created and target added successfully', userId: user.$id });
      } catch (error) {
        console.error('Error:', error.message);
      }
});


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
