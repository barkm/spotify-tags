import { useEffect, useState } from 'react'
import { authorize, isAuthorized, deauthorize } from './authorization'
import { Tagger } from './Tagger';
import { Creator } from './Creator';
import './App.css'  

type Mode = "login" | "select" | "tag" | "create"

function App () {
  console.log(import.meta.env.VITE_REDIRECT_URI);
  
  const [mode, setMode] = useState<Mode>("login");
  useEffect(() => {
    isAuthorized().then(() => setMode("select")).catch(() => {})
  }, [])
  switch (mode) {
    case "login":
      return <button onClick={authorize}> Log in </button>
    case "select":
      return <>
        <p><button onClick={() => setMode("tag")}>Tag song</button></p>
        <p><button onClick={() => setMode("create")}>Create playlist</button></p>
        <p><button onClick={() =>{deauthorize(); setMode("login")}}>Log out</button></p>
      </>
    case "tag":
      return <>
      <button onClick={() => setMode("select")}>back</button>
      <Tagger/>
      </>
    case "create":
      return <>
      <button onClick={() => setMode("select")}>back</button>
      <Creator/>
      </>
  }
  return <></>
}

export default App
