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

//ALLA APP GETTAR SOM HÄMTAR IN HTML SIDORNA
// hämtar in index.html, register.html och homepage.html så jag kan använda dem i mina routes
app.get("/", function (req, res) {
  res.sendFile(__dirname + "/register.html");
});

app.get("/index.html", function (req, res) {
  res.sendFile(__dirname + "/index.html");
});

app.get("/register.html", function (req, res) {
  res.sendFile(__dirname + "/register.html");
}); 

app.get("/newuser", function (req, res) {
  let sql = "SELECT * FROM newuser"; // ÄNDRA TILL NAMN PÅ ER EGEN TABELL (om den heter något annat än "users")
  let condition = createCondition(req.query); // output t.ex. " WHERE lastname='Rosencrantz'"
  console.log(sql + condition); // t.ex. SELECT * FROM users WHERE lastname="Rosencrantz"
  // skicka query till databasen
  con.query(sql + condition, function (err, result, fields) {
    res.send(result);
  });
});

app.get("/newuser/:username", function (req, res) {
  // Värdet på id ligger i req.params
  let sql = "SELECT * FROM newuser WHERE username='" + req.params.username + "'";
  console.log(sql);
  // skicka query till databasen
  con.query(sql, function (err, result, fields) {
    if (result.length > 0) {
      res.send(result);
    } else {
      res.sendStatus(404); // 404=not found
    }
  });
});


let createCondition = function (query) {
  // skapar ett WHERE-villkor utifrån query-parametrar
  console.log(query);
  let output = " WHERE ";
  for (let key in query) {
    if (COLUMNS.includes(key)) {
      // om vi har ett kolumnnamn i vårt query
      output += `${key}="${query[key]}" OR `; // t.ex. lastname="Rosencrantz"
    }
  }
  if (output.length == 7) {
    // " WHERE "
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



// skapar en post route för att kunna registrera en ny användare och lägga till den i databasen
app.post("/register", function (req, res) {
  const name = req.body.name;
  const email = req.body.email;
  const username = req.body.username;
  const password = req.body.password;

  // Hasha lösenordet med bcrypt och kontrollera efteråt om det gick bra
  bcrypt.hash(password, 10, function (err, hashedPassword) {
    if (err) {
      console.error("Hashing Error:", err);
      return res.status(500).json({ success: false, message: 'Fel vid hashning av lösenord' });
    }

    // Utför INSERT-frågan för att lägga till den nya användaren i databasen
    const sql = "INSERT INTO newuser (name, email, username, password) VALUES (?, ?, ?, ?)";
    con.query(sql, [name, email, username, hashedPassword], function (err, result) {
      if (err) {
        console.error("MySQL Query Error:", err);
        return res.status(500).json({ success: false, message: 'Fel vid registrering av ny användare' });
      }
      
         res.send(req.body);  // Endast skicka respons här
        });
      });
    });

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
          const token = jwt.sign({ username: username }, 'dinHemligaNyckel', { expiresIn: '1h' });
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






















  