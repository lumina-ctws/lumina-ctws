const express = require("express");
const fs = require("fs");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const FILE = "posts.json";

if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, "[]");
}

function loadPosts() {
    return JSON.parse(fs.readFileSync(FILE));
}

function savePosts(posts) {
    fs.writeFileSync(FILE, JSON.stringify(posts, null, 2));
}

app.get("/", (req, res) => {
    const posts = loadPosts();

    const postsHTML = posts.map((p, index) => {

        const commentsHTML = (p.comments || []).map(c =>
            `<div style="margin-left:20px;">
                <b>${c.author}</b>: ${c.text}
            </div>`
        ).join("");

        return `
        <div class="post">
            <b>${p.author}</b>: ${p.text}

            <div>
                ${commentsHTML}
            </div>

            <form method="POST" action="/comment/${index}">
                <input name="author" placeholder="Нік" required>
                <input name="text" placeholder="Коментар" required>
                <button>Коментувати</button>
            </form>
        </div>
        `;
    }).join("");

    res.send(`
        <link rel="stylesheet" href="/style.css">
        <div class="container">

            <h2>Новий пост</h2>

            <form method="POST" action="/add">
                <input name="author" placeholder="Ваш нік" required>
                <textarea name="text" placeholder="Ваш пост" required></textarea>
                <button>Додати пост</button>
            </form>

            <h3>Пости</h3>

            ${postsHTML || "<p>Постів ще немає</p>"}

        </div>
    `);
});

app.post("/add", (req, res) => {

    const posts = loadPosts();

    posts.push({
        author: req.body.author,
        text: req.body.text,
        comments: []
    });

    savePosts(posts);

    res.redirect("/");
});

app.post("/comment/:id", (req, res) => {

    const posts = loadPosts();
    const post = posts[req.params.id];

    post.comments.push({
        author: req.body.author,
        text: req.body.text
    });

    savePosts(posts);

    res.redirect("/");
});

app.listen(3000, () => {
    console.log("Server: http://localhost:3000");
});