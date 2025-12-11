const maintenanceMiddleware = (req, res, next) => {
  if (process.env.MODE === "maintenance") {
    let imgUrl;
    switch (process.env.STATUS) {
      case "libur":
        imgUrl = "https://uploader.danafxc.my.id/images/42ce1081-8726-4622-a41b-d787951a2e97.jpg";
        break;
      case "ujian":
        imgUrl = "https://uploader.danafxc.my.id/images/09c83723-b318-4609-af72-778a57cbe911.jpg";
        break;
      default:
        imgUrl = "https://uploader.danafxc.my.id/images/6519405f-9dfd-42a9-9046-4dadc450c5cb.jpg";
        break;
    }
    const htmlContent = `
            <!DOCTYPE html>
            <html lang="id">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Site Maintenance</title>
                <style>
                    body {
                        margin: 0; padding: 0; height: 100vh; width: 100vw;
                        display: flex; flex-direction: column; justify-content: center; align-items: center;
                        background-color: #ffffff; color: #e2e8f0; font-family: sans-serif;
                    }
                    img {
                        max-width: 90%; max-height: 60vh; border-radius: 12px;
                        margin-bottom: 20px;
                    }
                    h1 { margin: 0; font-size: 1.5rem; color: #38bdf8; }
                    p { color: #94a3b8; margin-top: 10px; }
                </style>
            </head>
            <body>
                <img src="${imgUrl}" alt="maintenance mode">
            </body>
            </html>
        `;

    return res.status(503).send(htmlContent);
  }

  next();
};

module.exports = maintenanceMiddleware;
