const express = require("express")
const fs = require("fs")
const session = require("express-session")
const multer = require("multer")

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.urlencoded({extended:true}))
app.use(express.static("public"))

app.use(session({
 secret:"lumina-secret",
 resave:false,
 saveUninitialized:true
}))

const USERS="users.json"
const POSTS="posts.json"

if(!fs.existsSync(USERS)) fs.writeFileSync(USERS,"[]")
if(!fs.existsSync(POSTS)) fs.writeFileSync(POSTS,"[]")

function load(file){
 return JSON.parse(fs.readFileSync(file))
}

function save(file,data){
 fs.writeFileSync(file,JSON.stringify(data,null,2))
}

const storage = multer.diskStorage({
 destination:"public/avatars",
 filename:(req,file,cb)=>{
  cb(null,Date.now()+"-"+file.originalname)
 }
})

const upload = multer({storage})

function navbar(user){
return `
<div class="nav">
<a href="/">Дім</a>
${user ? `<a href="/profile">Профіль</a>`:""}
${user ? `<a href="/logout">Вийти</a>`:`<a href="/login">Логін</a>`}
</div>
`
}

app.get("/",(req,res)=>{

 const posts = load(POSTS)

 const postsHTML = posts.map((p,pi)=>{

 const commentsHTML = (p.comments||[]).map((c,ci)=>{

 const repliesHTML = (c.replies||[]).map(r=>`
 <div class="reply">
 <b>${r.author}</b>: ${r.text}
 </div>
 `).join("")

 return `
 <div class="comment">

 <b>${c.author}</b>: ${c.text}

 ${repliesHTML}

 <form method="POST" action="/reply/${pi}/${ci}">
 <input name="text" placeholder="Відповідь">
 <button>↩</button>
 </form>

 </div>
 `
 }).join("")

 return `
 <div class="post">

 <div class="post-head">
 <img src="${p.avatar}" class="avatar">

 <div>
 <b>${p.author}</b>
 <small>${p.date}</small>
 </div>

 </div>

 <p>${p.text}</p>

 ${p.gif ? `<img src="${p.gif}" class="gif">` : ""}

 <form method="POST" action="/like/${p.id}">
 <button>👍 ${p.likes}</button>
 </form>

 ${commentsHTML}

 <form method="POST" action="/comment/${pi}">
 <input name="text" placeholder="Коментар">
 <button>💬</button>
 </form>

 </div>
 `
 }).join("")

 const form = req.session.user ? `
 <form method="POST" action="/add">

 <textarea name="text" placeholder="Що нового?"></textarea>

 <input name="gif" placeholder="GIF URL">

 <button>Опублікувати</button>

 </form>
 `:`<p>Увійдіть щоб писати пости</p>`

 res.send(`
 <link rel="stylesheet" href="/style.css">

 ${navbar(req.session.user)}

 <div class="container">

 <h2>Lumina</h2>

 ${form}

 ${postsHTML}

 </div>
 `)

})

app.post("/add",(req,res)=>{

 if(!req.session.user) return res.redirect("/login")

 const users = load(USERS)
 const user = users.find(u=>u.name===req.session.user)

 const posts = load(POSTS)

 posts.unshift({
 id:Date.now(),
 author:req.session.user,
 avatar:user.avatar,
 text:req.body.text,
 gif:req.body.gif || null,
 date:new Date().toLocaleString(),
 likes:0,
 comments:[]
 })

 save(POSTS,posts)

 res.redirect("/")

})

app.post("/like/:id",(req,res)=>{

 const posts = load(POSTS)
 const post = posts.find(p=>p.id==req.params.id)

 if(post) post.likes++

 save(POSTS,posts)

 res.redirect("/")

})

app.post("/comment/:post",(req,res)=>{

 if(!req.session.user) return res.redirect("/login")

 const posts = load(POSTS)

 posts[req.params.post].comments.push({
 author:req.session.user,
 text:req.body.text,
 replies:[]
 })

 save(POSTS,posts)

 res.redirect("/")

})

app.post("/reply/:post/:comment",(req,res)=>{

 if(!req.session.user) return res.redirect("/login")

 const posts = load(POSTS)

 posts[req.params.post].comments[req.params.comment].replies.push({
 author:req.session.user,
 text:req.body.text
 })

 save(POSTS,posts)

 res.redirect("/")

})

app.get("/login",(req,res)=>{

res.send(`
<link rel="stylesheet" href="/style.css">

${navbar()}

<div class="container">

<h2>Логін</h2>

<form method="POST">

<input name="name" placeholder="нік">

<input type="password" name="pass" placeholder="пароль">

<button>Увійти</button>

</form>

<a href="/register">Реєстрація</a>

</div>
`)
})

app.post("/login",(req,res)=>{

 const users = load(USERS)

 const user = users.find(u =>
 u.name===req.body.name &&
 u.pass===req.body.pass
 )

 if(user){
 req.session.user=user.name
 return res.redirect("/")
 }

 res.send("Невірний логін")

})

app.get("/register",(req,res)=>{

res.send(`
<link rel="stylesheet" href="/style.css">

${navbar()}

<div class="container">

<h2>Реєстрація</h2>

<form method="POST" enctype="multipart/form-data">

<input name="name" placeholder="нік">

<input type="password" name="pass" placeholder="пароль">

<input type="file" name="avatar">

<button>Створити</button>

</form>

</div>
`)
})

app.post("/register", upload.single("avatar"), (req,res)=>{

 const users = load(USERS)

 users.push({
 name:req.body.name,
 pass:req.body.pass,
 avatar:req.file ? "/avatars/"+req.file.filename : "/avatars/default.png"
 })

 save(USERS,users)

 res.redirect("/login")

})

app.get("/profile",(req,res)=>{

 if(!req.session.user) return res.redirect("/login")

 const users = load(USERS)
 const user = users.find(u=>u.name===req.session.user)

 res.send(`
<link rel="stylesheet" href="/style.css">

${navbar(req.session.user)}

<div class="container">

<h2>Профіль</h2>

<img src="${user.avatar}" class="avatar-big">

<p>${user.name}</p>

</div>
`)
})

app.get("/logout",(req,res)=>{
 req.session.destroy(()=>res.redirect("/"))
})

app.listen(PORT,()=>{
 console.log("Lumina running on "+PORT)
})