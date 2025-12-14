const maintenanceMiddleware = (req, res, next) => {
  if (process.env.MODE === "maintenance") {
    let imgUrl;
    switch (process.env.STATUS) {
      case "libur":
        imgUrl = "https://uploader.danafxc.my.id/images/1d6ea1f3-f56c-4e08-8f83-dd6c296bacd0.png";
        break;
      case "ujian":
        imgUrl = "https://uploader.danafxc.my.id/images/f0c25df3-f696-48af-a162-e4b1236dba05.png";
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
