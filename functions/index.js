//Firebase initialization

const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp(functions.config().firebase);
const refLink = "https://m.me/newspayper.fr";

// function to show the gallery of publications

exports.showGalerie = functions.https.onRequest((request, response) => {
  var elements1 = [];
  var cards = [];
  // Get user ID
  const userId = request.query["messenger user id"];
  // Get user Choices
  //  const choices = request.query["choices"];
  var ref = admin.database().ref("users/" + userId.toString());
  ref.once("value").then(function(snapshot) {
    var choices = snapshot.val().favoris;

    let choices_arr = choices.split(",");

    var publicationsRef = admin
      .database()
      .ref()
      .child("publications");

    // Get user publications list

    publicationsRef.once("value").then(function(snapshot) {
      snapshot.forEach(function(childSnapshot) {
        var childKey = childSnapshot.key;
        var childData = childSnapshot.val();
        for (var i = 0; i < choices_arr.length; i++) {
          // if user choice exist in title's name

          if (childKey.includes(choices_arr[i] + "_")) {
            cards.push({
              key: childKey,
              URL_achat: childData.URL_achat,
              URL_couv: childData.URL_couv,
              date_parution: childData.date_parution,
              numero: childData.numero,
              sommaire: childData.sommaire,
              tags: childData.tags,
              titre: childData.titre,
              titre_short: childData.titre_short
            });
          }
        }
      });
      // sort cards by date
      cards = cards.sort((a, b) =>
        a.date_parution < b.date_parution ? 1 : -1
      );

      //create card
      cards.forEach(function(childData) {
        card = {
          title: childData.titre + " n°" + childData.numero,
          image_url: childData.URL_couv,
          subtitle: childData.tags,
          messenger_extensions: true,
          default_action: {
            type: "web_url",
            url: childData.URL_couv
          },
          buttons: [
            {
              type: "show_block",
              block_names: ["Sommaire"],
              title: "\ud83d\udcdd Sommaire",
              set_attributes: {
                publication: childData.key
              }
            },
            {
              type: "show_block",
              block_names: ["Share"],
              title: "\ud83d\udc8c Envoyer à un ami",
              set_attributes: {
                publication: childData.key
              }
            }
          ]
        };
        //Bouton d'achat
        if (
          childData.URL_achat != undefined &&
          childData.URL_achat != "" &&
          childData.URL_achat != ""
        ) {
          card.buttons.push({
            type: "web_url",
            url: childData.URL_achat,
            title: "\ud83d\uded2 Acheter"
          });
        }

        //Add card to gallery

        elements1.push(card);
      });

      // add navigations buttons
      var boutonsNavigation = [];

      boutonsNavigation.push({
        type: "show_block",
        block_names: ["ShowWebview"],
        title: "Menu"
      });

      elements1.push({
        title: "Navigation",
        image_url:
          "https://res.cloudinary.com/newspayper/image/upload/b_rgb:474747,c_fit,e_shadow,h_970,q_90/b_rgb:00ADEF,c_lpad,h_1125,w_1125/Divers/presse_square-small.jpg",
        subtitle: "Utiliser les options ci-dessous",
        buttons: boutonsNavigation
      });

      // return the gallery,
      res = {
        messages: [
          {
            attachment: {
              type: "template",
              payload: {
                template_type: "generic",
                image_aspect_ratio: "square",
                elements: elements1
              }
            }
          }
        ]
      };
      console.log("hey this is the response ", res.toString());
      return response.json(res);
    });
  });
});

function verifyParam(value) {
  if (value === undefined || value === null || value.length === 0) {
    return false;
  }
  return true;
}

/********* Affichage du sommaire d'une publication *********/
exports.showSommaire = functions.https.onRequest((request, response) => {
  const messengerUserId = request.query["messenger user id"];
  if (!verifyParam(messengerUserId)) {
    badRequest(response, "Unable to find request parameter 'messengerUserId'.");
    return;
  }
  const idPublication = request.query["publication"];
  if (!verifyParam(idPublication)) {
    badRequest(response, "Unable to find request parameter 'publication'.");
    return;
  }

  var query = admin
    .database()
    .ref()
    .child("publications")
    .child(idPublication);

  query.once("value").then(function(snapshot) {
    var publication = snapshot.val();
    var texteSommaire = publication.sommaire;

    if (
      texteSommaire == undefined ||
      texteSommaire == "" ||
      texteSommaire.length > 2000
    ) {
      console.log("Pas de sommaire à afficher");
      response.end();
    } else {
      var quick_replies = [
        {
          title: "\ud83d\udc8c Partager",
          block_names: ["Share"]
        }
      ];

      var reponseJSON = {
        messages: [
          {
            text: "Voici le sommaire :"
          },
          {
            text: texteSommaire,
            quick_replies: quick_replies
          }
        ]
      };

      console.log("Réponse JSON : " + JSON.stringify(reponseJSON));

      //log de l'envoi à l'utilisateur
      var now = new Date();

      var logs = {};

      logs["timestamp"] = now.getTime();
      logs["idPublication"] = idPublication;
      logs["contenu_envoye"] = "sommaire";

      var refUser = admin
        .database()
        .ref("users")
        .child(messengerUserId);

      var updates = {};
      updates["messengerUserId"] = messengerUserId;
      updates["/logs/" + now.getTime()] = logs;

      console.log("updates : " + JSON.stringify(updates));

      refUser.update(updates).then(function() {
        console.log("envoi réponse JSON");
        response.json(reponseJSON);
      });
    }
  });
});

/********* Affichage d'une carte de partage de publication *********/
exports.shareCardPublication = functions.https.onRequest(
  (request, response) => {
    const messengerUserId = request.query["messenger user id"];
    if (!verifyParam(messengerUserId)) {
      badRequest(
        response,
        "Unable to find request parameter 'messengerUserId'."
      );
      return;
    }
    const firstName = request.query["first name"];
    if (!verifyParam(messengerUserId)) {
      console.log("Impossible de récupérer l'attribut 'first name'");
    }
    const lastName = request.query["last name"];
    if (!verifyParam(messengerUserId)) {
      console.log("Impossible de récupérer l'attribut 'last name'");
    }
    const idPublication = request.query["publication"];
    if (!verifyParam(idPublication)) {
      badRequest(response, "Unable to find request parameter 'publication'.");
      return;
    }

    var query = admin
      .database()
      .ref()
      .child("publications")
      .child(idPublication);

    query.once("value").then(function(snapshot) {
      if (null == snapshot.val()) {
        badRequest(
          response,
          "La référence de la publication '" + idPublication + "' est erronée."
        );
      } else {
        var publication = snapshot.val();
        var reponseJSON = {
          messages: [
            {
              attachment: {
                type: "template",
                payload: {
                  template_type: "generic",
                  image_aspect_ratio: "square",
                  elements: [
                    {
                      title:
                        "\u2705 Découvre " +
                        publication.titre +
                        " n°" +
                        publication.numero +
                        " avec Newspayper !",
                      image_url: publication.URL_couv,
                      subtitle:
                        "Pour voir les détails, clique sur l'image ou sur le bouton ci-dessous \ud83d\udc47",
                      default_action: {
                        type: "web_url",
                        url:
                          refLink +
                          "?ref=sharedPublication%7C" +
                          idPublication +
                          "%7C" +
                          messengerUserId +
                          "%7C" +
                          firstName +
                          "%7C" +
                          lastName
                      },
                      buttons: [
                        {
                          type: "web_url",
                          url:
                            refLink +
                            "?ref=sharedPublication%7C" +
                            idPublication +
                            "%7C" +
                            messengerUserId +
                            "%7C" +
                            firstName +
                            "%7C" +
                            lastName,
                          title: "\ud83d\udd0e Voir les détails"
                        },
                        {
                          type: "element_share"
                        }
                      ]
                    }
                  ]
                }
              }
            }
          ]
        };
        console.log(JSON.stringify(reponseJSON));
        response.json(reponseJSON);
      }
    });
  }
);
