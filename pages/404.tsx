import Page from "@/layout/Page";

const NotFound = () => (
  <Page title="Not Found" description="This is embarrassing." noCrawl>
    <section className="not-found-page">
      <h1>Chyba 404 :(</h1>
      <p>
        Jejda! Tuto stránku nelze nalézt. Zdá se, že na této stránce nebylo nic
        nalezeno.
      </p>
      <img src="/assets/404.jpg" alt="Not found" uk-img="" />
      <a href="/" className="tm-button tm-black-button">
        Zpět na hlavní stranu
      </a>
    </section>
  </Page>
);

export default NotFound;
