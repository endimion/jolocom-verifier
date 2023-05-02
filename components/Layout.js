import Head from "next/head";
import Header from "./Header.js";
import { Container } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

const Layout = props => (
  <div>
    <Head>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta charSet="utf-8" />
    </Head>
    <style jsx global>{`
      #__next,
      html,
      body,
      #__next > div {
        height: 100%;
      }

      .box-container {
        height: 100%;
        min-height: 100%;
        display: flex;
        flex-direction: column;
      }

      .box {
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      .box-fill-v {
        flex: 1;
      }
    `}</style>
    <Header />
    <Container className="box-container">
      {props.children}
      {/* <div className="box">this is the footer</div> */}
    </Container>
  </div>
);

export default Layout;
