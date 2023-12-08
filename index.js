const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const crypto = require("crypto")
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const mysql = require('mysql');

//först installerar och importerar vi express, body-parser, fs, crypto, bcrypt, jsonwebtoken och mysql
const app = express();
const port = 3000;

// Skapa en server som lyssnar på port 3000
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});


//hämtar min register.html fil
app.get("/", function (req, res) {
  res.sendFile(__dirname + "/register.html");
  
});

// gör en funktion som kollar om användaren är authoriserad eller inte med en token
let authenticateToken = function(req, res) {
  let token = req.header('Authorization').slice(7);
  console.log(token);

  if (!token) {
    return { success: false, message: 'Åtkomst nekad. Token saknas.' };
  }
  let decoded;
try {
  decoded = jwt.verify(token, 'dinHemligaNyckel');
  
} catch (error) {
  console.error(error);
  return { success: false, message: 'Åtkomst nekad. Ogiltigt token.' };
}
return {success: true, message: 'Token verifierad.', user: decoded};
}

// Protected route using the authenticateToken middleware
app.get("/newuser", function (req, res) {
let auth = authenticateToken(req, res);
console.log(auth);
if (!auth.success) {
  return res.status(401).json(auth);
  }

  let sql = "SELECT * FROM newuser";
  let condition = createCondition(req.query);

  con.query(sql + condition, function (err, result, fields) {
    res.send(result);
  });
});

// Protected route using the authenticateToken middleware
app.get("/newuser/:id", function (req, res) {
  let sql = "SELECT * FROM newuser WHERE id=" + req.params.id;

  con.query(sql, function (err, result, fields) {
    if (result.length > 0) {
      res.send(result);
    } else {
      res.sendStatus(404); // 404=not found
    }
  });
});

// använder en where sats för att kunna söka på användare i databasen
let createCondition = function (query) {
  console.log(query);
  let output = " WHERE ";
  for (let key in query) {
    if (COLUMNS.includes(key)) {
      output += `${key}="${query[key]}" OR `; 
    }
  }
  if (output.length == 7) {
    return ""; // om query är tomt eller inte är relevant för vår databastabell - returnera en tom sträng
  } else {
    return output.substring(0, output.length - 4); // ta bort sista " OR "
  }
};

// skapar en connection till min databas med rätt uppgifter
con = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'ellinors users',
  multipleStatements: true,
});

// använder länk till min css fil som ligger i public mappen
app.use(express.json());
app.use(express.static('public')); 

// används för att kunna läsa av vad som skrivs in i inputfälten
app.use(bodyParser.urlencoded({ extended: true }));


// skapar en connection till min databas med rätt uppgifter
app.post("/register", function (req, res) {
  if (!req.body.username) {
    res.status(400).send("Username required!");
    return;
  }
  let fields = ["username", "password", "name", "email"];
  for (let key in req.body) {
    if (!fields.includes(key)) {
      res.status(400).send("Unknown field: " + key);
      return;
    }
  }
  // Hasha lösenordet med bcrypt
  bcrypt.hash(req.body.password, 10, function (hashErr, hashedPassword) {
    if (hashErr) {
      console.error("Hashing Error:", hashErr);
      return res.status(500).json({ success: false, message: 'Error hashing the password' });
    }
// skapar en connection till min databas med rätt uppgifter
    let sql = `INSERT INTO newuser (username, password, name, email)
      VALUES ('${req.body.username}', 
      '${hashedPassword}',
      '${req.body.name}',
      '${req.body.email}');
      SELECT LAST_INSERT_ID();`;

  
    con.query(sql, function (err, result, fields) {
      if (err) {
        console.error("MySQL Query Error:", err);
        return res.status(500).json({ success: false, message: 'Error inserting new user' });
      }

      console.log(result);
      let output = {
        id: result[0].insertId,
        username: req.body.username,
        password: hashedPassword,  // Skicka det hashade lösenordet tillbaka
        name: req.body.name,
        email: req.body.email,
      };
      res.send(output);
    });
  });
});

// skapar en connection till min databas med rätt uppgifter
app.post("/login", function (req, res) {
  const username = req.body.username;
  const password = req.body.password;

  // Hämta användare från databasen baserat på användarnamn
  const sql = "SELECT * FROM newuser WHERE username = ?";
  con.query(sql, [username], function (err, result) {
    if (err) {
      console.error("MySQL Query Error:", err);
      return res.status(500).json({ success: false, message: 'Fel server error' });
    }
// kollar om användaren finns i databasen
    if (result.length > 0) {
      const storedHashedPassword = result[0].password;

      // Jämför det inmatade lösenordet med det hashade lösenordet från databasen
      bcrypt.compare(password, storedHashedPassword, function (bcryptErr, passwordMatch) {
        if (bcryptErr) {
          console.error("Bcrypt Error:", bcryptErr);
          return res.status(500).json({ success: false, message: 'Fel vid jämförelse av lösenord' });
        }

        if (passwordMatch) {
          // Inloggningen lyckades

          // Skapa en JWT-token
          const token = jwt.sign({ sub: username, username: username }, 'dinHemligaNyckel');

          // Skicka token som svar
          res.json({ success: true, message: 'Inloggning lyckades', token: token });
        } else {
          // Fel lösenord
          return res.json({ success: false, message: 'Ogiltigt lösenord' });
        }
      });
    } else {
      // Användaren finns inte
      return res.json({ success: false, message: 'Användaren finns inte' });
    }
  });
});
// skapar en connection till min databas med rätt uppgifter
app.put("/newuser/:id", function (req, res) {

  // kolla först att all data som ska finnas finns i request-body
  if (!(req.body && req.body.name && req.body.email && req.body.password && req.body.username)) {
    // om data saknas i body
    res.sendStatus(400);
    return;
  }
  // skapa SQL-satsen
  let sql = `UPDATE newuser 
        SET name = '${req.body.name}', email = '${req.body.email}', password = '${req.body.password}', username = '${req.body.username}'
        WHERE id = ${req.params.id}`;

  // skicka SQL-satsen till databasen
  con.query(sql, function (err, result, fields) {
    if (err) {
      throw err;
      //kod här för felhantering, skicka felmeddelande osv.
    } else {
      // meddela klienten att request har processats OK
      res.sendStatus(200);
    }
  });
});






















  