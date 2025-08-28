const moduleRaid = function () {
  moduleRaid.mID = Math.random().toString(36).substring(7);
  moduleRaid.mObj = {};

  // fillModuleArray = function () {
  //     (
  //         window.webpackChunkbuild || window.webpackChunkwhatsapp_web_client
  //     ).push([
  //         [moduleRaid.mID],
  //         {},
  //         function (e) {
  //             Object.keys(e.m).forEach(function (mod) {
  //                 moduleRaid.mObj[mod] = e(mod);
  //             });
  //         },
  //     ]);
  // };
  fillModuleArray = function () {
    if (parseFloat(window.Debug.VERSION) < 2.3) {
      (window.webpackChunkbuild || window.webpackChunkwhatsapp_web_client).push(
        [
          [moduleRaid.mID],
          {},
          function (e) {
            Object.keys(e.m).forEach(function (mod) {
              moduleRaid.mObj[mod] = e(mod);
            });
          },
        ]
      );
    } else {
      let modules = self.require("__debug").modulesMap;
      Object.keys(modules)
        .filter((e) => e.includes("WA"))
        .forEach(function (mod) {
          let modulos = modules[mod];
          if (modulos) {
            moduleRaid.mObj[mod] = {
              default: modulos.defaultExport,
              factory: modulos.factory,
              ...modulos,
            };
            if (Object.keys(moduleRaid.mObj[mod].default).length == 0) {
              try {
                self.ErrorGuard.skipGuardGlobal(true);
                Object.assign(moduleRaid.mObj[mod], self.importNamespace(mod));
              } catch (e) {}
            }
          }
        });
    }
  };

  fillModuleArray();

  get = function get(id) {
    return moduleRaid.mObj[id];
  };

  findModule = function findModule(query) {
    results = [];
    modules = Object.keys(moduleRaid.mObj);

    modules.forEach(function (mKey) {
      mod = moduleRaid.mObj[mKey];

      if (typeof mod !== "undefined") {
        if (typeof query === "string") {
          if (typeof mod.default === "object") {
            for (key in mod.default) {
              if (key == query) results.push(mod);
            }
          }

          for (key in mod) {
            if (key == query) results.push(mod);
          }
        } else if (typeof query === "function") {
          if (query(mod)) {
            results.push(mod);
          }
        } else {
          throw new TypeError(
            "findModule can only find via string and function, " +
              typeof query +
              " was passed"
          );
        }
      }
    });

    return results;
  };

  return {
    modules: moduleRaid.mObj,
    constructors: moduleRaid.cArr,
    findModule: findModule,
    get: get,
  };
};

if (typeof module === "object" && module.exports) {
  module.exports = moduleRaid;
} else {
  window.mR = moduleRaid();
}

//JS WAWEBJS EDITED BY NUR FAHMI INDOSOFTHOUSE - JOMBIZ
window.Store = Object.assign(
  {},
  window.mR.findModule((m) => m.default && m.default.Chat)[0].default
);
window.Store.AppState = window.mR.findModule("Socket")[0].Socket;
window.Store.Conn = window.mR.findModule("Conn")[0].Conn;
window.Store.BlockContact = window.mR.findModule("blockContact")[0];
// window.Store.Call = window.mR.findModule("CallCollection")[0].CallCollection;
window.Store.Cmd = window.mR.findModule("Cmd")[0].Cmd;
window.Store.CryptoLib = window.mR.findModule("decryptE2EMedia")[0];
window.Store.DownloadManager =
  window.mR.findModule("downloadManager")[0].downloadManager;
//window.Store.Features = window.mR.findModule(
//  "FEATURE_CHANGE_EVENT"
//)[0].LegacyPhoneFeatures;
window.Store.GroupMetadata =
  window.mR.findModule("GroupMetadata")[0].default.GroupMetadata;
window.Store.Invite = window.mR.findModule("sendJoinGroupViaInvite")[0];
window.Store.InviteInfo = window.mR.findModule("sendQueryGroupInvite")[0];
window.Store.Label = window.mR.findModule("LabelCollection")[0].LabelCollection;
window.Store.MediaPrep = window.mR.findModule("MediaPrep")[0];
window.Store.MediaObject = window.mR.findModule("getOrCreateMediaObject")[0];
window.Store.NumberInfo = window.mR.findModule("formattedPhoneNumber")[0];
window.Store.MediaTypes = window.mR.findModule("msgToMediaType")[0];
window.Store.MediaUpload = window.mR.findModule("uploadMedia")[0];
window.Store.MsgKey = window.mR.findModule(
  (module) => module.default && module.default.fromString
)[0].default;
window.Store.MessageInfo = window.mR.findModule("sendQueryMsgInfo")[0];
window.Store.OpaqueData = window.mR.findModule(
  (module) => module.default && module.default.createFromData
)[0].default;
window.Store.QueryExist = window.mR.findModule("queryExists")[0]
  ? window.mR.findModule("queryExists")[0].queryExists
  : window.mR.findModule("queryExist")[0].queryExist;
window.Store.QueryProduct = window.mR.findModule("queryProduct")[0];
window.Store.QueryOrder = window.mR.findModule("queryOrder")[0];
window.Store.SendClear = window.mR.findModule("sendClear")[0];
window.Store.SendDelete = window.mR.findModule("sendDelete")[0];
window.Store.SendMessage = window.mR.findModule("addAndSendMsgToChat")[0];
window.Store.SendSeen = window.mR.findModule("sendSeen")[0];
window.Store.User = window.mR.findModule("getMaybeMeUser")[0];
window.Store.UploadUtils = window.mR.findModule((module) =>
  module.default && module.default.encryptAndUpload ? module.default : null
)[0].default;
window.Store.UserConstructor = window.mR.findModule((module) =>
  module.default &&
  module.default.prototype &&
  module.default.prototype.isServer &&
  module.default.prototype.isUser
    ? module.default
    : null
)[0].default;
window.Store.Validators = window.mR.findModule("findLinks")[0];
window.Store.VCard = window.mR.findModule("vcardFromContactModel")[0];
window.Store.WidFactory = window.mR.findModule("createWid")[0];
window.Store.ProfilePic = window.mR.findModule("profilePicResync")[0];
window.Store.PresenceUtils = window.mR.findModule("sendPresenceAvailable")[0];
window.Store.ChatState = window.mR.findModule("sendChatStateComposing")[0];
window.Store.GroupParticipants = window.mR.findModule(
  "sendPromoteParticipants"
)[0];
window.Store.JoinInviteV4 = window.mR.findModule("sendJoinGroupViaInviteV4")[0];
window.Store.findCommonGroups =
  window.mR.findModule("findCommonGroups")[0].findCommonGroups;
window.Store.StatusUtils = window.mR.findModule("setMyStatus")[0];
window.Store.ConversationMsgs = window.mR.findModule("loadEarlierMsgs")[0];
window.Store.sendReactionToMsg =
  window.mR.findModule("sendReactionToMsg")[0].sendReactionToMsg;
window.Store.createOrUpdateReactionsModule = window.mR.findModule(
  "createOrUpdateReactions"
)[0];
window.Store.EphemeralFields = window.mR.findModule("getEphemeralFields")[0];
window.Store.ReplyUtils =
  window.mR.findModule("canReplyMsg").length > 0 &&
  window.mR.findModule("canReplyMsg")[0];
window.Store.StickerTools = {
  ...window.mR.findModule("toWebpSticker")[0],
  ...window.mR.findModule("addWebpMetadata")[0],
};

window.Store.GroupUtils = {
  ...window.mR.findModule("sendCreateGroup")[0],
  ...window.mR.findModule("sendSetGroupSubject")[0],
  ...window.mR.findModule("markExited")[0],
};

if (!window.Store.Chat._find) {
  window.Store.Chat._find = (e) => {
    const target = window.Store.Chat.get(e);
    return target
      ? Promise.resolve(target)
      : Promise.resolve({
          id: e,
        });
  };
}

// TODO remove these once everybody has been updated to WWebJS with legacy sessions removed
const _linkPreview = window.mR.findModule("queryLinkPreview");
if (_linkPreview && _linkPreview[0] && _linkPreview[0].default) {
  window.Store.Wap = _linkPreview[0].default;
}

const _isMDBackend = window.mR.findModule("isMDBackend");
if (_isMDBackend && _isMDBackend[0] && _isMDBackend[0].isMDBackend) {
  window.Store.MDBackend = _isMDBackend[0].isMDBackend();
} else {
  window.Store.MDBackend = true;
}
// };

// exports.LoadUtils = () => {
window.WWebJS = {};
window.WWebJS.getNumberId = async (number) => {
  if (number.endsWith("@c.us")) number.replace("@c.us", "");
  {
    try {
      const result = await window.Store.QueryExist(
        "phone",
        number.startsWith("+") ? number : `+${number}`
      );
      if (!result || result.wid === undefined) return null;
      return result.wid;
    } catch (e) {
      // if (e && e.toString() == "Error: user must have an id or a phone") {
      const result = await window.Store.QueryExist({
        type: "phone",
        phone: number.startsWith("+") ? number : `+${number}`,
      });
      if (!result || result.wid === undefined) return null;
      return result.wid;
      // } else return null;
    }
  }
};

window.WWebJS.sendSeen = async (chatId) => {
  let chat = window.Store.Chat.get(chatId);
  if (chat !== undefined) {
    await window.Store.SendSeen.sendSeen(chat, false);
    return true;
  }
  return false;
};

window.WWebJS.sendMessage = async (chat, content, options = {}) => {
  let attOptions = {};
  if (options.attachment) {
    attOptions = options.sendMediaAsSticker
      ? await window.WWebJS.processStickerData(options.attachment)
      : await window.WWebJS.processMediaData(options.attachment, {
          forceVoice: options.sendAudioAsVoice,
          forceDocument: options.sendMediaAsDocument,
          forceGif: options.sendVideoAsGif,
        });

    content = options.sendMediaAsSticker ? undefined : attOptions.preview;

    delete options.attachment;
    delete options.sendMediaAsSticker;
  }

  let quotedMsgOptions = {};
  if (options.quotedMessageId) {
    let quotedMessage = window.Store.Msg.get(options.quotedMessageId);
    if (quotedMessage.canReply()) {
      quotedMsgOptions = quotedMessage.msgContextInfo(chat);
    }
    delete options.quotedMessageId;
  }

  if (options.mentionedJidList) {
    options.mentionedJidList = options.mentionedJidList.map(
      (cId) => window.Store.Contact.get(cId).id
    );
  }

  let locationOptions = {};
  if (options.location) {
    locationOptions = {
      type: "location",
      loc: options.location.description,
      lat: options.location.latitude,
      lng: options.location.longitude,
    };
    delete options.location;
  }

  let vcardOptions = {};
  if (options.contactCard) {
    let contact = window.Store.Contact.get(options.contactCard);
    vcardOptions = {
      body: window.Store.VCard.vcardFromContactModel(contact).vcard,
      type: "vcard",
      vcardFormattedName: contact.formattedName,
    };
    delete options.contactCard;
  } else if (options.contactCardList) {
    let contacts = options.contactCardList.map((c) =>
      window.Store.Contact.get(c)
    );
    let vcards = contacts.map((c) =>
      window.Store.VCard.vcardFromContactModel(c)
    );
    vcardOptions = {
      type: "multi_vcard",
      vcardList: vcards,
      body: undefined,
    };
    delete options.contactCardList;
  } else if (
    options.parseVCards &&
    typeof content === "string" &&
    content.startsWith("BEGIN:VCARD")
  ) {
    delete options.parseVCards;
    try {
      const parsed = window.Store.VCard.parseVcard(content);
      if (parsed) {
        vcardOptions = {
          type: "vcard",
          vcardFormattedName: window.Store.VCard.vcardGetNameFromParsed(parsed),
        };
      }
    } catch (_) {
      // not a vcard
    }
  }

  if (options.linkPreview) {
    delete options.linkPreview;

    // Not supported yet by WhatsApp Web on MD
    if (!window.Store.MDBackend) {
      const link = window.Store.Validators.findLink(content);
      if (link) {
        const preview = await window.Store.Wap.queryLinkPreview(link.url);
        preview.preview = true;
        preview.subtype = "url";
        options = {...options, ...preview};
      }
    }
  }

  let buttonOptions = {};
  if (options.buttons) {
    let caption;
    if (options.buttons.type === "chat") {
      content = options.buttons.body;
      caption = content;
    } else {
      caption = options.caption ? options.caption : " "; //Caption can't be empty
    }
    buttonOptions = {
      productHeaderImageRejected: false,
      isFromTemplate: false,
      isDynamicReplyButtonsMsg: true,
      title: options.buttons.title ? options.buttons.title : undefined,
      footer: options.buttons.footer ? options.buttons.footer : undefined,
      dynamicReplyButtons: options.buttons.buttons,
      replyButtons: options.buttons.buttons,
      caption: caption,
    };
    delete options.buttons;
  }

  let listOptions = {};
  if (options.list) {
    if (
      window.Store.Conn.platform === "smba" ||
      window.Store.Conn.platform === "smbi"
    ) {
      throw "[LT01] Whatsapp business can't send this yet";
    }
    listOptions = {
      type: "list",
      footer: options.list.footer,
      list: {
        ...options.list,
        listType: 1,
      },
      body: options.list.description,
    };
    delete options.list;
    delete listOptions.list.footer;
  }

  const meUser = window.Store.User.getMaybeMeUser();
  const isMD = window.Store.MDBackend;

  const newMsgId = new window.Store.MsgKey({
    from: meUser,
    to: chat.id,
    id: window.Store.MsgKey.newId(),
    participant: isMD && chat.id.isGroup() ? meUser : undefined,
    selfDir: "out",
  });

  const extraOptions = options.extraOptions || {};
  delete options.extraOptions;

  const ephemeralSettings = {
    ephemeralDuration: chat.isEphemeralSettingOn()
      ? chat.getEphemeralSetting()
      : undefined,
    ephemeralSettingTimestamp: chat.getEphemeralSettingTimestamp() || undefined,
    disappearingModeInitiator: chat.getDisappearingModeInitiator() || undefined,
  };

  const message = {
    ...options,
    id: newMsgId,
    ack: 0,
    body: content,
    from: meUser,
    to: chat.id,
    local: true,
    self: "out",
    t: parseInt(new Date().getTime() / 1000),
    isNewMsg: true,
    type: "chat",
    ...ephemeralSettings,
    ...locationOptions,
    ...attOptions,
    ...quotedMsgOptions,
    ...vcardOptions,
    ...buttonOptions,
    ...listOptions,
    ...extraOptions,
  };

  await window.Store.SendMessage.addAndSendMsgToChat(chat, message);
  return window.Store.Msg.get(newMsgId._serialized);
};

window.WWebJS.toStickerData = async (mediaInfo) => {
  if (mediaInfo.mimetype == "image/webp") return mediaInfo;

  const file = window.WWebJS.mediaInfoToFile(mediaInfo);
  const webpSticker = await window.Store.StickerTools.toWebpSticker(file);
  const webpBuffer = await webpSticker.arrayBuffer();
  const data = window.WWebJS.arrayBufferToBase64(webpBuffer);

  return {
    mimetype: "image/webp",
    data,
  };
};

window.WWebJS.processStickerData = async (mediaInfo) => {
  if (mediaInfo.mimetype !== "image/webp")
    throw new Error("Invalid media type");

  const file = window.WWebJS.mediaInfoToFile(mediaInfo);
  let filehash = await window.WWebJS.getFileHash(file);
  let mediaKey = await window.WWebJS.generateHash(32);

  const controller = new AbortController();
  const uploadedInfo = await window.Store.UploadUtils.encryptAndUpload({
    blob: file,
    type: "sticker",
    signal: controller.signal,
    mediaKey,
  });

  const stickerInfo = {
    ...uploadedInfo,
    clientUrl: uploadedInfo.url,
    deprecatedMms3Url: uploadedInfo.url,
    uploadhash: uploadedInfo.encFilehash,
    size: file.size,
    type: "sticker",
    filehash,
  };

  return stickerInfo;
};

window.WWebJS.processMediaData = async (
  mediaInfo,
  {forceVoice, forceDocument, forceGif}
) => {
  const file = window.WWebJS.mediaInfoToFile(mediaInfo);
  const mData = await window.Store.OpaqueData.createFromData(file, file.type);
  const mediaPrep = window.Store.MediaPrep.prepRawMedia(mData, {
    asDocument: forceDocument,
  });
  const mediaData = await mediaPrep.waitForPrep();
  const mediaObject = window.Store.MediaObject.getOrCreateMediaObject(
    mediaData.filehash
  );

  const mediaType = window.Store.MediaTypes.msgToMediaType({
    type: mediaData.type,
    isGif: mediaData.isGif,
  });

  if (forceVoice && mediaData.type === "audio") {
    mediaData.type = "ptt";
  }

  if (forceGif && mediaData.type === "video") {
    mediaData.isGif = true;
  }

  if (forceDocument) {
    mediaData.type = "document";
  }

  if (!(mediaData.mediaBlob instanceof window.Store.OpaqueData)) {
    mediaData.mediaBlob = await window.Store.OpaqueData.createFromData(
      mediaData.mediaBlob,
      mediaData.mediaBlob.type
    );
  }

  mediaData.renderableUrl = mediaData.mediaBlob.url();
  mediaObject.consolidate(mediaData.toJSON());
  mediaData.mediaBlob.autorelease();

  const uploadedMedia = await window.Store.MediaUpload.uploadMedia({
    mimetype: mediaData.mimetype,
    mediaObject,
    mediaType,
  });

  const mediaEntry = uploadedMedia.mediaEntry;
  if (!mediaEntry) {
    throw new Error("upload failed: media entry was not created");
  }

  mediaData.set({
    clientUrl: mediaEntry.mmsUrl,
    deprecatedMms3Url: mediaEntry.deprecatedMms3Url,
    directPath: mediaEntry.directPath,
    mediaKey: mediaEntry.mediaKey,
    mediaKeyTimestamp: mediaEntry.mediaKeyTimestamp,
    filehash: mediaObject.filehash,
    encFilehash: mediaEntry.encFilehash,
    uploadhash: mediaEntry.uploadHash,
    size: mediaObject.size,
    streamingSidecar: mediaEntry.sidecar,
    firstFrameSidecar: mediaEntry.firstFrameSidecar,
  });

  return mediaData;
};

window.WWebJS.getMessageModel = (message) => {
  const msg = message.serialize();

  msg.isEphemeral = message.isEphemeral;
  msg.isStatusV3 = message.isStatusV3;
  msg.links = message.getLinks().map((link) => ({
    link: link.href,
    isSuspicious: Boolean(
      link.suspiciousCharacters && link.suspiciousCharacters.size
    ),
  }));

  if (msg.buttons) {
    msg.buttons = msg.buttons.serialize();
  }
  if (msg.dynamicReplyButtons) {
    msg.dynamicReplyButtons = JSON.parse(
      JSON.stringify(msg.dynamicReplyButtons)
    );
  }
  if (msg.replyButtons) {
    msg.replyButtons = JSON.parse(JSON.stringify(msg.replyButtons));
  }

  if (typeof msg.id.remote === "object") {
    msg.id = Object.assign({}, msg.id, {remote: msg.id.remote._serialized});
  }

  delete msg.pendingAckUpdate;

  return msg;
};

window.WWebJS.getChatModel = async (chat) => {
  let res = chat.serialize();
  res.isGroup = chat.isGroup;
  res.formattedTitle = chat.formattedTitle;
  res.isMuted = chat.mute && chat.mute.isMuted;

  if (chat.groupMetadata) {
    const chatWid = window.Store.WidFactory.createWid(chat.id._serialized);
    await window.Store.GroupMetadata.update(chatWid);
    res.groupMetadata = chat.groupMetadata.serialize();
  }

  delete res.msgs;
  delete res.msgUnsyncedButtonReplyMsgs;
  delete res.unsyncedButtonReplies;

  return res;
};

window.WWebJS.getChat = async (chatId) => {
  const chatWid = window.Store.WidFactory.createWid(chatId);
  const chat = await window.Store.Chat.find(chatWid);
  return await window.WWebJS.getChatModel(chat);
};

window.WWebJS.getChats = async () => {
  const chats = window.Store.Chat.models;

  const chatPromises = chats.map((chat) => window.WWebJS.getChatModel(chat));
  return await Promise.all(chatPromises);
};

window.WWebJS.getContactModel = (contact) => {
  let res = contact.serialize();
  res.isBusiness = contact.isBusiness;

  if (contact.businessProfile) {
    res.businessProfile = contact.businessProfile.serialize();
  }

  res.isMe = contact.isMe;
  res.isUser = contact.isUser;
  res.isGroup = contact.isGroup;
  res.isWAContact = contact.isWAContact;
  res.isMyContact = contact.isMyContact;
  res.isBlocked = contact.isContactBlocked;
  res.userid = contact.userid;

  return res;
};

window.WWebJS.getContact = async (contactId) => {
  const wid = window.Store.WidFactory.createWid(contactId);
  const contact = await window.Store.Contact.find(wid);
  return window.WWebJS.getContactModel(contact);
};

window.WWebJS.getContacts = () => {
  const contacts = window.Store.Contact._models;
  return contacts.map((contact) => window.WWebJS.getContactModel(contact));
};

window.WWebJS.mediaInfoToFile = ({data, mimetype, filename}) => {
  const binaryData = window.atob(data);

  const buffer = new ArrayBuffer(binaryData.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binaryData.length; i++) {
    view[i] = binaryData.charCodeAt(i);
  }

  const blob = new Blob([buffer], {type: mimetype});
  return new File([blob], filename, {
    type: mimetype,
    lastModified: Date.now(),
  });
};

window.WWebJS.arrayBufferToBase64 = (arrayBuffer) => {
  let binary = "";
  const bytes = new Uint8Array(arrayBuffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

window.WWebJS.getFileHash = async (data) => {
  let buffer = await data.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
};

window.WWebJS.generateHash = async (length) => {
  var result = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

window.WWebJS.sendClearChat = async (chatId) => {
  let chat = window.Store.Chat.get(chatId);
  if (chat !== undefined) {
    await window.Store.SendClear.sendClear(chat, false);
    return true;
  }
  return false;
};

window.WWebJS.sendDeleteChat = async (chatId) => {
  let chat = window.Store.Chat.get(chatId);
  if (chat !== undefined) {
    await window.Store.SendDelete.sendDelete(chat);
    return true;
  }
  return false;
};

window.WWebJS.sendChatstate = async (state, chatId) => {
  if (window.Store.MDBackend) {
    chatId = window.Store.WidFactory.createWid(chatId);
  }
  switch (state) {
    case "typing":
      await window.Store.ChatState.sendChatStateComposing(chatId);
      break;
    case "recording":
      await window.Store.ChatState.sendChatStateRecording(chatId);
      break;
    case "stop":
      await window.Store.ChatState.sendChatStatePaused(chatId);
      break;
    default:
      throw "Invalid chatstate";
  }

  return true;
};

window.WWebJS.getLabelModel = (label) => {
  let res = label.serialize();
  res.hexColor = label.hexColor;

  return res;
};

window.WWebJS.getLabels = () => {
  const labels = window.Store.Label.models;
  return labels.map((label) => window.WWebJS.getLabelModel(label));
};

window.WWebJS.getLabel = (labelId) => {
  const label = window.Store.Label.get(labelId);
  return window.WWebJS.getLabelModel(label);
};

window.WWebJS.getChatLabels = async (chatId) => {
  const chat = await window.WWebJS.getChat(chatId);
  return (chat.labels || []).map((id) => window.WWebJS.getLabel(id));
};

window.WWebJS.getOrderDetail = async (orderId, token, chatId) => {
  const chatWid = window.Store.WidFactory.createWid(chatId);
  return window.Store.QueryOrder.queryOrder(chatWid, orderId, 80, 80, token);
};

window.WWebJS.getProductMetadata = async (productId) => {
  let sellerId = window.Store.Conn.wid;
  let product = await window.Store.QueryProduct.queryProduct(
    sellerId,
    productId
  );
  if (product && product.data) {
    return product.data;
  }

  return undefined;
};
async function sendMsg(chatId, konten, options, sendSeen) {
  const chatWid = window.Store.WidFactory.createWid(chatId);
  const chat = await window.Store.Chat.find(chatWid);
  if (sendSeen) {
    sendSeen(chatId);
  }
  const msg = await window.WWebJS.sendMessage(chat, konten, options, sendSeen);
  return msg.serialize();
}
function getgrup() {
  if (
    !window.Store.Contact.get(window.Store.User.getMeUser()._serialized)
      .commonGroups
  ) {
    window.Store.findCommonGroups(
      window.Store.Contact.get(window.Store.User.getMeUser()._serialized)
    );
    return "aa";
  } else {
    return window.Store.Contact.get(
      window.Store.User.getMeUser()._serialized
    ).commonGroups.serialize();
  }
}
const joinGroup = (group) => {
  const link = document.createElement("a");
  link.setAttribute("href", `${group}`);
  document.body.append(link);
  link.click();
  document.body.removeChild(link);
};

var ready = "";

const openChat = (phone) => {
  const link = document.createElement("a");
  link.setAttribute("href", `whatsapp://send?phone=${phone}`);
  document.body.append(link);
  link.click();
  document.body.removeChild(link);
};
window.Store.LidUtils = window.require("WAWebApiContact");
function tulisText(par) {
  messageBox = document.querySelectorAll("[contenteditable='true']")[1];

  message = par; // Replace My Message with your message

  counter = 5; // Replace 5 with the number of times you want to send your message

  for (i = 0; i < counter; i++) {
    event = document.createEvent("UIEvents");
    messageBox.innerHTML = message; // test it
    event.initUIEvent("input", true, true, window, 1);
    messageBox.dispatchEvent(event);
  }
}

function tulisMedia(par) {
  messageBox = document.querySelectorAll("[contenteditable='true']")[0];

  message = par; // Replace My Message with your message

  counter = 5; // Replace 5 with the number of times you want to send your message

  for (i = 0; i < counter; i++) {
    event = document.createEvent("UIEvents");
    messageBox.innerHTML = message; // test it
    event.initUIEvent("input", true, true, window, 1);
    messageBox.dispatchEvent(event);
  }
}
var eventFire = (MyElement, ElementType) => {
  var MyEvent = document.createEvent("MouseEvents");
  MyEvent.initMouseEvent(
    ElementType,
    true,
    true,
    window,
    0,
    0,
    0,
    0,
    0,
    false,
    false,
    false,
    false,
    0,
    null
  );
  MyElement.dispatchEvent(MyEvent);
};

//WAPI2 AKA STORE2 BY NUR FAHMI INDOSOFTHOUSE-JOMBIZ
/**
 * This script contains WAPI functions that need to be run in the context of the webpage
 */

/**
 * Auto discovery the webpack object references of instances that contains all functions used by the WAPI
 * functions and creates the Store2 object.
 */
// if (!window.Store2) {
// 	(function () {
// 		function getStore2(modules) {
// 			let foundCount = 0;
// 			let neededObjects = [
// 				{
// 					id: "Store2",
// 					conditions: (module) =>
// 						module.default && module.default.Chat && module.default.Msg
// 							? module.default
// 							: null,
// 				},
// 				{
// 					id: "MediaCollection",
// 					conditions: (module) =>
// 						module.default &&
// 						module.default.prototype &&
// 						module.default.prototype.processAttachments
// 							? module.default
// 							: null,
// 				},
// 				{
// 					id: "MediaProcess",
// 					conditions: (module) => (module.BLOB ? module : null),
// 				},
// 				{
// 					id: "Wap",
// 					conditions: (module) => (module.createGroup ? module : null),
// 				},
// 				{
// 					id: "ServiceWorker",
// 					conditions: (module) =>
// 						module.default && module.default.killServiceWorker ? module : null,
// 				},
// 				{
// 					id: "State",
// 					conditions: (module) =>
// 						module.STATE && module.STREAM ? module : null,
// 				},
// 				{
// 					id: "WapDelete",
// 					conditions: (module) =>
// 						module.sendConversationDelete &&
// 						module.sendConversationDelete.length == 2
// 							? module
// 							: null,
// 				},
// 				{
// 					id: "Conn",
// 					conditions: (module) =>
// 						module.default && module.default.ref && module.default.refTTL
// 							? module.default
// 							: module.Conn && module.Conn.ref && module.Conn.refTTL
// 							? module.Conn
// 							: null,
// 				},
// 				{
// 					id: "WapQuery",
// 					conditions: (module) =>
// 						module.default && module.instance && module.instance.queryExist
// 							? module.instance
// 							: null,
// 				},
// 				{
// 					id: "CryptoLib",
// 					conditions: (module) => (module.decryptE2EMedia ? module : null),
// 				},
// 				{
// 					id: "OpenChat",
// 					conditions: (module) =>
// 						module.default &&
// 						module.default.prototype &&
// 						module.default.prototype.openChat
// 							? module.default
// 							: null,
// 				},
// 				{
// 					id: "UserConstructor",
// 					conditions: (module) =>
// 						module.default &&
// 						module.default.prototype &&
// 						module.default.prototype.isServer &&
// 						module.default.prototype.isUser
// 							? module.default
// 							: null,
// 				},
// 				{
// 					id: "SendTextMsgToChat",
// 					conditions: (module) =>
// 						module.sendTextMsgToChat ? module.sendTextMsgToChat : null,
// 				},
// 				{
// 					id: "SendSeen",
// 					conditions: (module) => (module.sendSeen ? module.sendSeen : null),
// 				},
// 				{
// 					id: "sendDelete",
// 					conditions: (module) =>
// 						module.sendDelete ? module.sendDelete : null,
// 				},
// 				{
// 					id: "FeatureChecker",
// 					conditions: (module) =>
// 						module && module.getProtobufFeatureName ? module : null,
// 				},
// 				{
// 					id: "GetMaybeMeUser",
// 					conditions: (module) =>
// 						module && module.getMaybeMeUser ? module : null,
// 				},
// 				{
// 					id: "QueryExist",
// 					conditions: (module) => (module.queryExist ? module : null),
// 				},
// 				{
// 					id: "FindChat",
// 					conditions: (module) =>
// 						module.findChat
// 							? module
// 							: module.default && module.default.findChat
// 							? module.default
// 							: null,
// 				},
// 				{
// 					id: "checkNumberBeta",
// 					conditions: (module) =>
// 						module.default &&
// 						typeof module.default.toString === "function" &&
// 						module.default
// 							.toString()
// 							.includes("Should not reach queryExists MD")
// 							? module.default
// 							: null,
// 				},
// 				{
// 					id: "WidFactory",
// 					conditions: (module) =>
// 						module.isWidlike && module.createWid && module.createWidFromWidLike
// 							? module
// 							: null,
// 				},
// 			];
// 			for (let idx in modules) {
// 				if (typeof modules[idx] === "object" && modules[idx] !== null) {
// 					neededObjects.forEach((needObj) => {
// 						if (!needObj.conditions || needObj.foundedModule) return;
// 						let neededModule = needObj.conditions(modules[idx]);
// 						if (neededModule !== null) {
// 							foundCount++;
// 							needObj.foundedModule = neededModule;
// 						}
// 					});

// 					if (foundCount == neededObjects.length) {
// 						break;
// 					}
// 				}
// 			}

// 			let neededStore2 = neededObjects.find(
// 				(needObj) => needObj.id === "Store2"
// 			);
// 			window.Store2 = neededStore2.foundedModule
// 				? neededStore2.foundedModule
// 				: {};

// 			window.Store2.Chat._find = (e) => {
// 				const target = window.Store2.Chat.get(e);
// 				return target
// 					? Promise.resolve(target)
// 					: Promise.resolve({
// 							id: e,
// 					  });
// 			};

// 			neededObjects.splice(neededObjects.indexOf(neededStore2), 1);
// 			neededObjects.forEach((needObj) => {
// 				if (needObj.foundedModule) {
// 					window.Store2[needObj.id] = needObj.foundedModule;
// 				}
// 			});

// 			window.Store2.Chat.modelClass.prototype.sendMessage = function (e) {
// 				window.Store2.SendTextMsgToChat(this, ...arguments);
// 			};

// 			return window.Store2;
// 		}

// 		if (typeof webpackJsonp === "function") {
// 			webpackJsonp([], { parasite: (x, y, z) => getStore2(z) }, ["parasite"]);
// 		} else {
// 			let tag = new Date().getTime();
// 			webpackChunkwhatsapp_web_client.push([
// 				["parasite" + tag],
// 				{},
// 				function (o, e, t) {
// 					let modules = [];
// 					for (let idx in o.m) {
// 						let module = o(idx);
// 						modules.push(module);
// 					}
// 					getStore2(modules);
// 				},
// 			]);
// 		}
// 	})();
// }
if (!window.Store2) {
  (function () {
    function getStore2(modules) {
      let foundCount = 0;
      let neededObjects = [
        {
          id: "Store2",
          conditions: (module) =>
            module.default && module.default.Chat && module.default.Msg
              ? module.default
              : null,
        },
        {
          id: "MediaCollection",
          conditions: (module) =>
            module.default &&
            module.default.prototype &&
            (module.default.prototype.processFiles !== undefined ||
              module.default.prototype.processAttachments !== undefined)
              ? module.default
              : null,
        },
        {
          id: "MediaProcess",
          conditions: (module) => (module.BLOB ? module : null),
        },
        {
          id: "Archive",
          conditions: (module) => (module.setArchive ? module : null),
        },
        {
          id: "Block",
          conditions: (module) =>
            module.blockContact && module.unblockContact ? module : null,
        },
        {
          id: "ChatUtil",
          conditions: (module) => (module.sendClear ? module : null),
        },
        {
          id: "GroupInvite",
          conditions: (module) => (module.queryGroupInviteCode ? module : null),
        },
        {
          id: "Wap",
          conditions: (module) => (module.createGroup ? module : null),
        },
        {
          id: "ServiceWorker",
          conditions: (module) =>
            module.default && module.default.killServiceWorker ? module : null,
        },
        {
          id: "State",
          conditions: (module) =>
            module.STATE && module.STREAM ? module : null,
        },
        {
          id: "_Presence",
          conditions: (module) =>
            module.setPresenceAvailable && module.setPresenceUnavailable
              ? module
              : null,
        },
        {
          id: "WapDelete",
          conditions: (module) =>
            module.sendConversationDelete &&
            module.sendConversationDelete.length == 2
              ? module
              : null,
        },

        {
          id: "Conn",
          conditions: (module) =>
            module.default && module.default.ref && module.default.refTTL
              ? module.default
              : module.Conn && module.Conn.ref && module.Conn.refTTL
              ? module.Conn
              : null,
        },

        {
          id: "WapQuery",
          conditions: (module) =>
            module.default && module.default.queryExist ? module.default : null,
        },
        {
          id: "QueryExist",
          conditions: (module) => (module.queryExist ? module : null),
        },

        {
          id: "ChatCollection",
          conditions: (module) => (module.ChatCollection ? module : null),
        },

        {
          id: "CryptoLib",
          conditions: (module) => (module.decryptE2EMedia ? module : null),
        },
        {
          id: "OpenChat",
          conditions: (module) =>
            module.default &&
            module.default.prototype &&
            module.default.prototype.openChat
              ? module.default
              : null,
        },
        {
          id: "UserConstructor",
          conditions: (module) =>
            module.default &&
            module.default.prototype &&
            module.default.prototype.isServer &&
            module.default.prototype.isUser
              ? module.default
              : null,
        },
        {
          id: "SendTextMsgToChat",
          conditions: (module) =>
            module.sendTextMsgToChat ? module.sendTextMsgToChat : null,
        },
        {
          id: "ReadSeen",
          conditions: (module) => (module.sendSeen ? module : null),
        },
        {
          id: "sendDelete",
          conditions: (module) =>
            module.sendDelete ? module.sendDelete : null,
        },
        {
          id: "addAndSendMsgToChat",
          conditions: (module) =>
            module.addAndSendMsgToChat && module.resendMsgToChat
              ? module.addAndSendMsgToChat
              : null,
        },
        {
          id: "sendMsgToChat",
          conditions: (module) =>
            module.sendMsgToChat ? module.sendMsgToChat : null,
        },
        {
          id: "Catalog",
          conditions: (module) => (module.Catalog ? module.Catalog : null),
        },
        {
          id: "bp",
          conditions: (module) => (module.default ? module.default : null),
        },
        {
          id: "MsgKey",
          conditions: (module) =>
            module.default && module.default.fromString ? module.default : null,
        },

        {
          id: "EphemeralFields ",
          conditions: (module) => (module.getEphemeralFields ? module : null),
        },

        {
          id: "Parser",
          conditions: (module) =>
            module.convertToTextWithoutSpecialEmojis ? module.default : null,
        },
        {
          id: "Builders",
          conditions: (module) =>
            module.TemplateMessage && module.HydratedFourRowTemplate
              ? module
              : null,
        },
        {
          id: "Me",
          conditions: (module) =>
            module.PLATFORMS && module.Conn ? module.default : null,
        },
        {
          id: "CallUtils",
          conditions: (module) =>
            module.sendCallEnd && module.parseCall ? module : null,
        },
        {
          id: "Identity",
          conditions: (module) =>
            module.queryIdentity && module.updateIdentity ? module : null,
        },
        {
          id: "MyStatus",
          conditions: (module) =>
            module.getStatus && module.setMyStatus ? module : null,
        },
        {
          id: "ChatStates",
          conditions: (module) =>
            module.sendChatStatePaused &&
            module.sendChatStateRecording &&
            module.sendChatStateComposing
              ? module
              : null,
        },
        {
          id: "GroupActions",
          conditions: (module) =>
            module.sendExitGroup && module.localExitGroup ? module : null,
        },
        {
          id: "Features",
          conditions: (module) =>
            module.FEATURE_CHANGE_EVENT && module.features ? module : null,
        },
        {
          id: "MessageUtils",
          conditions: (module) =>
            module.storeMessages && module.appendMessage ? module : null,
        },
        {
          id: "WebMessageInfo",
          conditions: (module) =>
            module.WebMessageInfo && module.WebFeatures
              ? module.WebMessageInfo
              : null,
        },
        {
          id: "createMessageKey",
          conditions: (module) =>
            module.createMessageKey && module.createDeviceSentMessage
              ? module.createMessageKey
              : null,
        },
        {
          id: "Participants",
          conditions: (module) =>
            module.addParticipants &&
            module.removeParticipants &&
            module.promoteParticipants &&
            module.demoteParticipants
              ? module
              : null,
        },
        {
          id: "WidFactory",
          conditions: (module) =>
            module.isWidlike && module.createWid && module.createWidFromWidLike
              ? module
              : null,
        },
        {
          id: "getMeUser",
          conditions: (module) => (module.getMeUser ? module.getMeUser : null),
        },
        {
          id: "User",
          conditions: (module) =>
            module.getMaybeMeUser ? module.getMaybeMeUser : null,
        },
        {
          id: "Base",
          conditions: (module) =>
            module.setSubProtocol && module.binSend && module.actionNode
              ? module
              : null,
        },
        {
          id: "BlobCache",
          conditions: (module) =>
            module && module.MediaBlobCache ? module.MediaBlobCache : null,
        },
        {
          id: "Sticker",
          conditions: (module) =>
            module.default && module.default.Sticker
              ? module.default.Sticker
              : null,
        },
        {
          id: "MediaUpload",
          conditions: (module) =>
            module.default && module.default.mediaUpload
              ? module.default
              : null,
        },
        {
          id: "UploadUtils",
          conditions: (module) =>
            module.default && module.default.encryptAndUpload
              ? module.default
              : null,
        },

        {
          id: "DownloadManager",
          conditions: (module) =>
            module.default && module.downloadManager
              ? module.downloadManager
              : null,
        },
      ];

      for (let idx in modules) {
        if (typeof modules[idx] === "object" && modules[idx] !== null) {
          neededObjects.forEach((needObj) => {
            if (!needObj.conditions || needObj.foundedModule) return;

            let neededModule = needObj.conditions(modules[idx]);

            if (neededModule !== null) {
              foundCount++;
              needObj.foundedModule = neededModule;
            }
          });

          if (foundCount == neededObjects.length) {
            break;
          }
        }
      }

      let neededStore2 = neededObjects.find(
        (needObj) => needObj.id === "Store2"
      );
      window.Store2 = neededStore2.foundedModule
        ? neededStore2.foundedModule
        : {};
      neededObjects.splice(neededObjects.indexOf(neededStore2), 1);

      neededObjects.forEach((needObj) => {
        if (needObj.foundedModule)
          window.Store2[needObj.id] = needObj.foundedModule;
      });

      window.Store2.Chat.modelClass.prototype.sendMessage = function (e) {
        window.Store2.SendTextMsgToChat(this, ...arguments);
      };

      if (!window.Store2.Chat._find) {
        window.Store2.Chat._find = (e) => {
          const target = window.Store2.Chat.get(e);
          return target
            ? Promise.resolve(target)
            : Promise.resolve({
                id: e,
              });
        };
      }

      neededObjects.forEach((needObj) => {
        if (needObj.foundedModule) {
          if (needObj.id == "ChatCollection") {
            window.Store2[needObj.id].ChatCollection.findImpl =
              window.Store2[needObj.id].ChatCollection._find;
          }
        }
      });

      return window.Store2;
    }

    let modObj = {};

    if (parseFloat(window.Debug.VERSION) < 2.3) {
      (window.webpackChunkbuild || window.webpackChunkwhatsapp_web_client).push(
        [
          ["parasiteijn34h82hdf"],
          {},
          function (findMod) {
            // Percorrendo os módulos encontrados e adicionando-os ao objeto modObj
            Object.keys(findMod.m).forEach(function (mod) {
              modObj[mod] = findMod(mod);
            });
          },
        ]
      );
    } else {
      let modules = self.require("__debug").modulesMap;
      Object.keys(modules)
        .filter((e) => e.includes("WA"))
        .forEach(function (mod) {
          let modulos = modules[mod];
          if (modulos) {
            modObj[mod] = {
              default: modulos.defaultExport,
              factory: modulos.factory,
              ...modulos,
            };
            if (Object.keys(modObj[mod].default).length == 0) {
              try {
                self.ErrorGuard.skipGuardGlobal(true);
                Object.assign(modObj[mod], self.importNamespace(mod));
              } catch (e) {}
            }
          }
        });
    }

    getStore2(modObj);
  })();
}
window.WAPI = {
  lastRead: {},
};

window.WAPI._serializeRawObj = (obj) => {
  if (obj) {
    return obj.toJSON();
  }
  return {};
};

/**
 * Serializes a chat object
 *
 * @param rawChat Chat object
 * @returns {{}}
 */

window.WAPI._serializeChatObj = (obj) => {
  if (obj == undefined) {
    return null;
  }

  return Object.assign(window.WAPI._serializeRawObj(obj), {
    kind: obj.kind,
    isGroup: obj.isGroup,
    contact: obj["contact"]
      ? window.WAPI._serializeContactObj(obj["contact"])
      : null,
    groupMetadata: obj["groupMetadata"]
      ? window.WAPI._serializeRawObj(obj["groupMetadata"])
      : null,
    presence: obj["presence"]
      ? window.WAPI._serializeRawObj(obj["presence"])
      : null,
    msgs: null,
  });
};

window.WAPI._serializeContactObj = (obj) => {
  if (obj == undefined) {
    return null;
  }

  return Object.assign(window.WAPI._serializeRawObj(obj), {
    formattedName: obj.formattedName,
    isHighLevelVerified: obj.isHighLevelVerified,
    isMe: obj.isMe,
    isMyContact: obj.isMyContact,
    isPSA: obj.isPSA,
    isUser: obj.isUser,
    isVerified: obj.isVerified,
    isWAContact: obj.isWAContact,
    profilePicThumbObj: obj.profilePicThumb
      ? WAPI._serializeProfilePicThumb(obj.profilePicThumb)
      : {},
    statusMute: obj.statusMute,
    msgs: null,
  });
};

window.WAPI._serializeMessageObj = (obj) => {
  if (obj == undefined) {
    return null;
  }

  return Object.assign(window.WAPI._serializeRawObj(obj), {
    id: obj.id._serialized,
    sender: obj["senderObj"]
      ? WAPI._serializeContactObj(obj["senderObj"])
      : null,
    timestamp: obj["t"],
    content: obj["body"],
    isGroupMsg: obj.isGroupMsg,
    isLink: obj.isLink,
    isMMS: obj.isMMS,
    isMedia: obj.isMedia,
    isNotification: obj.isNotification,
    isPSA: obj.isPSA,
    type: obj.type,
    chat: WAPI._serializeChatObj(obj["chat"]),
    chatId: obj.id.remote,
    quotedMsgObj: WAPI._serializeMessageObj(obj["_quotedMsgObj"]),
    mediaData: window.WAPI._serializeRawObj(obj["mediaData"]),
  });
};

window.WAPI._serializeNumberStatusObj = (obj) => {
  if (obj == undefined) {
    return null;
  }

  return Object.assign(
    {},
    {
      id: obj.jid,
      status: obj.status,
      isBusiness: obj.biz === true,
      canReceiveMessage: obj.status === 200,
    }
  );
};

window.WAPI._serializeProfilePicThumb = (obj) => {
  if (obj == undefined) {
    return null;
  }

  return Object.assign(
    {},
    {
      eurl: obj.eurl,
      id: obj.id,
      img: obj.img,
      imgFull: obj.imgFull,
      raw: obj.raw,
      tag: obj.tag,
    }
  );
};

// https://github.com/mukulhase/WebWhatsapp-Wrapper/issues/771
window.WAPI.sendTyping = async function (chatId, done) {
  // await window.Store2.WapQuery.sendPresenceAvailable()
  await window.Store2.WapQuery.sendChatstateComposing(chatId);
};

window.WAPI.createGroup = function (name, contactsId) {
  if (!Array.isArray(contactsId)) {
    contactsId = [contactsId];
  }

  return window.Store2.Wap.createGroup(name, contactsId);
};

window.WAPI.leaveGroup = function (groupId) {
  groupId = typeof groupId == "string" ? groupId : groupId._serialized;
  var group = WAPI.getChat(groupId);
  return group.sendExit();
};

window.WAPI.getAllContacts = function (done) {
  const contacts = window.Store2.Contact.map((contact) =>
    WAPI._serializeContactObj(contact)
  );

  if (done !== undefined) done(contacts);
  return contacts;
};

/**
 * Fetches all contact objects from Store2, filters them
 *
 * @param done Optional callback function for async execution
 * @returns {Array|*} List of contacts
 */
window.WAPI.getMyContacts = function (done) {
  const contacts = window.Store2.Contact.filter(
    (contact) => contact.isMyContact === true
  ).map((contact) => WAPI._serializeContactObj(contact));
  if (done !== undefined) done(contacts);
  return contacts;
};

/**
 * Fetches contact object from Store2 by ID
 *
 * @param id ID of contact
 * @param done Optional callback function for async execution
 * @returns {T|*} Contact object
 */
window.WAPI.getContact = function (id, done) {
  const found = window.Store2.Contact.get(id);

  if (done !== undefined) done(window.WAPI._serializeContactObj(found));
  return window.WAPI._serializeContactObj(found);
};

/**
 * Fetches all chat objects from Store2
 *
 * @param done Optional callback function for async execution
 * @returns {Array|*} List of chats
 */
window.WAPI.getAllChats = function (done) {
  const chats = window.Store2.Chat.map((chat) => WAPI._serializeChatObj(chat));

  if (done !== undefined) done(chats);
  return chats;
};

window.WAPI.haveNewMsg = function (chat) {
  return chat.unreadCount > 0;
};

window.WAPI.getAllChatsWithNewMsg = function (done) {
  const chats = window.Store2.Chat.filter(window.WAPI.haveNewMsg).map((chat) =>
    WAPI._serializeChatObj(chat)
  );

  if (done !== undefined) done(chats);
  return chats;
};

/**
 * Fetches all chat IDs from Store2
 *
 * @param done Optional callback function for async execution
 * @returns {Array|*} List of chat id's
 */
window.WAPI.getAllChatIds = function (done) {
  const chatIds = window.Store2.Chat.map(
    (chat) => chat.id._serialized || chat.id
  );

  if (done !== undefined) done(chatIds);
  return chatIds;
};

/**
 * Fetches all groups objects from Store2
 *
 * @param done Optional callback function for async execution
 * @returns {Array|*} List of chats
 */
window.WAPI.getAllGroups = function (done) {
  const groups = window.Store2.Chat.filter((chat) => chat.isGroup);

  if (done !== undefined) done(groups);
  return groups;
};

/**
 * Fetches chat object from Store2 by ID
 *
 * @param id ID of chat
 * @param done Optional callback function for async execution
 * @returns {T|*} Chat object
 */
window.WAPI.getChatOld = function (id, done) {
  id = typeof id == "string" ? id : id._serialized;
  const found = window.Store2.Chat.get(id);
  found.sendMessage = found.sendMessage
    ? found.sendMessage
    : function () {
        return window.Store2.sendMessage.apply(this, arguments);
      };
  if (done !== undefined) done(found);
  return found;
};

window.WAPI.isMultiDeviceVersion = function () {
  try {
    let resp = window.Store2.FeatureChecker.GK.features["MD_BACKEND"];
    return resp;
  } catch {
    return false;
  }
};

window.WAPI.getChatCreate = function (id, done) {
  // New version WhatsApp Beta Multi Device
  if (WAPI.isBeta()) {
    let chat = window.Store2.Chat.get(id);
    if (chat) {
      if (chat.sendMessage) {
        if (done) done(chat);
        return chat;
      } else {
        if (done) done(chat._value);
        return chat._value;
      }
    } else {
      // Create user
      var idx = new window.Store2.UserConstructor(id, {
        intentionallyUsePrivateConstructor: true,
      });

      window.Store2.FindChat.findChat(idx)
        .then((chat) => {
          if (done) done(chat);
        })
        .catch((e) => {
          if (done) done(null);
        });
      return undefined;
    }
  }
  // Old version
  else {
    id = typeof id == "string" ? id : id._serialized;
    const found = window.Store2.Chat.get(id);
    found.sendMessage = found.sendMessage
      ? found.sendMessage
      : function () {
          return window.Store2.sendMessage.apply(this, arguments);
        };
    if (done !== undefined) done(found);
    return found;
  }
};

window.WAPI.getChat = function (id, done) {
  // New version WhatsApp Beta Multi Device
  if (WAPI.isBeta()) {
    let chat = window.Store2.Chat.get(id);
    if (chat) {
      if (chat.sendMessage) {
        if (done) done(chat);
        return chat;
      } else {
        if (done) done(chat._value);
        return chat._value;
      }
    } else {
      // Create user
      // desabilitado pois criava um usuario inexistente com nove na esquerda
      /**
      var idx = new window.Store2.UserConstructor(id, { intentionallyUsePrivateConstructor: true });

      window.Store2.FindChat.findChat(idx).then(chat => {
        if (done) done(chat);
      }).catch(e => {
        if (done) done(null);
      }) **/
      return undefined;
    }
  }
  // Old version
  else {
    id = typeof id == "string" ? id : id._serialized;
    const found = window.Store2.Chat.get(id);
    found.sendMessage = found.sendMessage
      ? found.sendMessage
      : function () {
          return window.Store2.sendMessage.apply(this, arguments);
        };
    if (done !== undefined) done(found);
    return found;
  }
};

window.WAPI.getChatByName = function (name, done) {
  const found = window.WAPI.getAllChats().find((val) =>
    val.name.includes(name)
  );
  if (done !== undefined) done(found);
  return found;
};

window.WAPI.sendImageFromDatabasePicBot = function (picId, chatId, caption) {
  var chatDatabase = window.WAPI.getChatByName("DATABASEPICBOT");
  var msgWithImg = chatDatabase.msgs.find((msg) => msg.caption == picId);

  if (msgWithImg === undefined) {
    return false;
  }
  var chatSend = WAPI.getChat(chatId);
  if (chatSend === undefined) {
    return false;
  }
  const oldCaption = msgWithImg.caption;

  msgWithImg.id.id = window.WAPI.getNewId();
  msgWithImg.id.remote = chatId;
  msgWithImg.t = Math.ceil(new Date().getTime() / 1000);
  msgWithImg.to = chatId;

  if (caption !== undefined && caption !== "") {
    msgWithImg.caption = caption;
  } else {
    msgWithImg.caption = "";
  }

  msgWithImg.collection.send(msgWithImg).then(function (e) {
    msgWithImg.caption = oldCaption;
  });

  return true;
};

window.WAPI.sendMessageWithThumb = function (
  thumb,
  url,
  title,
  description,
  text,
  chatId,
  done
) {
  var chatSend = WAPI.getChat(chatId);
  if (chatSend === undefined) {
    if (done !== undefined) done(false);
    return false;
  }
  var linkPreview = {
    canonicalUrl: url,
    description: description,
    matchedText: url,
    title: title,
    thumbnail: thumb,
    compose: true,
  };
  chatSend.sendMessage(text, {
    linkPreview: linkPreview,
    mentionedJidList: [],
    quotedMsg: null,
    quotedMsgAdminGroupJid: null,
  });
  if (done !== undefined) done(true);
  return true;
};

window.WAPI.getNewId = function () {
  var text = "";
  var possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 20; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
};

window.WAPI.getChatExistsById = function (id, done) {
  let found = WAPI.getChatExists(id);
  if (found) {
    found = WAPI._serializeChatObj(found);
  } else {
    found = false;
  }

  if (done !== undefined) done(found);
  return found;
};

window.WAPI.getChatById = function (id, done) {
  let found = WAPI.getChat(id);
  if (found) {
    found = WAPI._serializeChatObj(found);
  } else {
    found = false;
  }

  if (done !== undefined) done(found);
  return found;
};

/**
 * I return all unread messages from an asked chat and mark them as read.
 *
 * :param id: chat id
 * :type  id: string
 *
 * :param includeMe: indicates if user messages have to be included
 * :type  includeMe: boolean
 *
 * :param includeNotifications: indicates if notifications have to be included
 * :type  includeNotifications: boolean
 *
 * :param done: callback passed by selenium
 * :type  done: function
 *
 * :returns: list of unread messages from asked chat
 * :rtype: object
 */
window.WAPI.getUnreadMessagesInChat = function (
  id,
  includeMe,
  includeNotifications,
  done
) {
  // get chat and its messages
  let chat = WAPI.getChat(id);
  let messages = chat.msgs._models;

  // initialize result list
  let output = [];

  // look for unread messages, newest is at the end of array
  for (let i = messages.length - 1; i >= 0; i--) {
    // system message: skip it
    if (i === "remove") {
      continue;
    }

    // get message
    let messageObj = messages[i];

    // found a read message: stop looking for others
    if (
      typeof messageObj.isNewMsg !== "boolean" ||
      messageObj.isNewMsg === false
    ) {
      continue;
    } else {
      messageObj.isNewMsg = false;
      // process it
      let message = WAPI.processMessageObj(
        messageObj,
        includeMe,
        includeNotifications
      );

      // save processed message on result list
      if (message) output.push(message);
    }
  }
  // callback was passed: run it
  if (done !== undefined) done(output);
  // return result list
  return output;
};

/**
 * Load more messages in chat object from Store2 by ID
 *
 * @param id ID of chat
 * @param done Optional callback function for async execution
 * @returns None
 */
window.WAPI.loadEarlierMessages = function (id, done) {
  const found = WAPI.getChat(id);
  if (done !== undefined) {
    found.loadEarlierMsgs().then(function () {
      done();
    });
  } else {
    found.loadEarlierMsgs();
  }
};

/**
 * Load more messages in chat object from Store2 by ID
 *
 * @param id ID of chat
 * @param done Optional callback function for async execution
 * @returns None
 */
window.WAPI.loadAllEarlierMessages = function (id, done) {
  const found = WAPI.getChat(id);
  x = function () {
    if (!found.msgs.msgLoadState.noEarlierMsgs) {
      found.loadEarlierMsgs().then(x);
    } else if (done) {
      done();
    }
  };
  x();
};

window.WAPI.asyncLoadAllEarlierMessages = function (id, done) {
  done();
  window.WAPI.loadAllEarlierMessages(id);
};

window.WAPI.areAllMessagesLoaded = function (id, done) {
  const found = WAPI.getChat(id);
  if (!found.msgs.msgLoadState.noEarlierMsgs) {
    if (done) done(false);
    return false;
  }
  if (done) done(true);
  return true;
};

window.WAPI.areAllMessagesLoadedTillDate = function (id, lastMessage, done) {
  const found = WAPI.getChat(id);
  if (
    found.msgs._models[0].t > lastMessage &&
    !found.msgs.msgLoadState.noEarlierMsgs
  ) {
    if (done) done(true);
    return false;
  } else {
    if (done) done(true);
    return true;
  }
};

/**
 * Load more messages in chat object from Store2 by ID till a particular date
 *
 * @param id ID of chat
 * @param lastMessage UTC timestamp of last message to be loaded
 * @param done Optional callback function for async execution
 * @returns None
 */

window.WAPI.loadEarlierMessagesTillDate = function (id, lastMessage, done) {
  const found = WAPI.getChat(id);
  x = function () {
    if (
      found.msgs._models[0].t > lastMessage &&
      !found.msgs.msgLoadState.noEarlierMsgs
    ) {
      found.loadEarlierMsgs().then(x);
    } else {
      done();
    }
  };
  x();
};

/**
 * Fetches all group metadata objects from Store2
 *
 * @param done Optional callback function for async execution
 * @returns {Array|*} List of group metadata
 */
window.WAPI.getAllGroupMetadata = function (done) {
  const groupData = window.Store2.GroupMetadata.map(
    (groupData) => groupData.all
  );

  if (done !== undefined) done(groupData);
  return groupData;
};

/**
 * Fetches group metadata object from Store2 by ID
 *
 * @param id ID of group
 * @param done Optional callback function for async execution
 * @returns {T|*} Group metadata object
 */
window.WAPI.getGroupMetadata = async function (id, done) {
  let output = window.Store2.GroupMetadata.get(id);

  if (output !== undefined) {
    if (output.stale) {
      await window.Store2.GroupMetadata.update(id);
    }
  }

  if (done !== undefined) done(output);
  return output;
};

/**
 * Fetches group participants
 *
 * @param id ID of group
 * @returns {Promise.<*>} Yields group metadata
 * @private
 */
window.WAPI._getGroupParticipants = async function (id) {
  const metadata = await WAPI.getGroupMetadata(id);
  return metadata.participants;
};

/**
 * Fetches IDs of group participants
 *
 * @param id ID of group
 * @param done Optional callback function for async execution
 * @returns {Promise.<Array|*>} Yields list of IDs
 */
window.WAPI.getGroupParticipantIDs = async function (id, done) {
  const output = (await WAPI._getGroupParticipants(id)).map(
    (participant) => participant.id
  );

  if (done !== undefined) done(output);
  return output;
};

window.WAPI.getGroupAdmins = async function (id, done) {
  const output = (await WAPI._getGroupParticipants(id))
    .filter((participant) => participant.isAdmin)
    .map((admin) => admin.id);

  if (done !== undefined) done(output);
  return output;
};

/**
 * Gets object representing the logged in user
 *
 * @returns {Array|*|$q.all}
 */
window.WAPI.getMe = function (done) {
  const rawMe = window.Store2.Contact.get(window.Store2.Conn.me);

  if (done !== undefined) done(rawMe.all);
  return rawMe.all;
};

window.WAPI.isLoggedIn = function (done) {
  // Contact always exists when logged in
  const isLogged =
    window.Store2.Contact && window.Store2.Contact.checksum !== undefined;

  if (done !== undefined) done(isLogged);
  return isLogged;
};

window.WAPI.isConnected = function (done) {
  // Phone Disconnected icon appears when phone is disconnected from the tnternet
  const isConnected =
    document.querySelector('*[data-icon="alert-phone"]') !== null
      ? false
      : true;

  if (done !== undefined) done(isConnected);
  return isConnected;
};

window.WAPI.processMessageObj = function (
  messageObj,
  includeMe,
  includeNotifications
) {
  if (messageObj.isNotification) {
    if (includeNotifications) {
      ret = WAPI._serializeMessageObj(messageObj);
      delete ret.waveform;
      delete ret.mediaData.waveform;
      return ret;
    } else {
      return;
    }
    // System message
    // (i.e. "Messages you send to this chat and calls are now secured with end-to-end encryption...")
  } else if (messageObj.id.fromMe === false || includeMe) {
    ret = WAPI._serializeMessageObj(messageObj);
    delete ret.waveform;
    delete ret.mediaData.waveform;
    return ret;
  }
  return;
};

window.WAPI.getAllMessagesInChat = function (
  id,
  includeMe,
  includeNotifications,
  done
) {
  const chat = WAPI.getChat(id);
  let output = [];
  const messages = chat.msgs._models;

  for (const i in messages) {
    if (i === "remove") {
      continue;
    }
    const messageObj = messages[i];

    let message = WAPI.processMessageObj(
      messageObj,
      includeMe,
      includeNotifications
    );
    if (message) output.push(message);
  }
  if (done !== undefined) done(output);
  return output;
};

window.WAPI.getAllMessageIdsInChat = function (
  id,
  includeMe,
  includeNotifications,
  done
) {
  const chat = WAPI.getChat(id);
  let output = [];
  const messages = chat.msgs._models;

  for (const i in messages) {
    if (
      i === "remove" ||
      (!includeMe && messages[i].isMe) ||
      (!includeNotifications && messages[i].isNotification)
    ) {
      continue;
    }
    output.push(messages[i].id._serialized);
  }
  if (done !== undefined) done(output);
  return output;
};

window.WAPI.getMessageById = function (id, done) {
  let result = false;
  let json = false;
  try {
    let msg = window.Store2.Msg.get(id);
    //console.log("msg ok: "+id);
    if (msg) {
      result = WAPI.processMessageObj(msg, true, true);
      // remove wave form from result
      //delete result.waveform;
      //delete result.mediaData.waveform;
      // console.log("process ok: "+id+" "+result.sender.formattedName+" "+result.content);//+" "+JSON.stringify(result));
      //json = JSON.stringify(result)
    }
  } catch (err) {}
  if (done !== undefined) {
    done(result);
  } else {
    return result;
  }
};

/*
 * Reply with Quote given idMessage with text message
 * @param
 */
window.WAPI.ReplyMessage = function (idMessage, message, done) {
  var messageObject = Store2.Msg.get(idMessage);
  if (messageObject === undefined) {
    if (done !== undefined) done(false);
    return false;
  }
  messageObject = messageObject.valueOf();
  const chat = Store2.Chat.get(messageObject.chat.id);
  if (chat !== undefined) {
    if (done !== undefined) {
      let params = {
        quotedMsg: messageObject,
      };
      chat.sendMessage(message, params).then(function () {
        function sleep(ms) {
          return new Promise((resolve) => setTimeout(resolve, ms));
        }
        var trials = 0;
        function check() {
          let msg = chat.getLastReceivedMsg(),
            isSameText = function (a, b) {
              return escape((a + "").trim()) == escape((b + "").trim());
            };
          if (!(!msg.senderObj.isMe || !isSameText(msg.body, message))) {
            done(WAPI._serializeMessageObj(msg));
            return true;
          }
          // Failover, loop through from msgs
          for (let i = chat.msgs._models.length - 1; i >= 0; i--) {
            msg = chat.msgs._models[i];
            if (!(!msg.senderObj.isMe || !isSameText(msg.body, message))) {
              done(WAPI._serializeMessageObj(msg));
              return true;
            }
          }
          trials += 1;
          console.log(trials);
          if (trials > 30) {
            done(true);
            return;
          }
          sleep(500).then(check);
        }
        check();
      });
      return true;
    } else {
      chat.sendMessage(message, null, messageObject);
      return true;
    }
  } else {
    if (done !== undefined) done(false);
    return false;
  }
};

window.WAPI.sendMessageToIDOld = function (id, message, done) {
  let chat = Store2.FindChat.findChat(Store2.WidFactory.createWid(id));
  WAPI.sendMessage(id, message);
  //done(true);
};

window.WAPI.sendMessageToID = function (id, message, done) {
  try {
    // New version WhatsApp Beta
    if (WAPI.isBeta()) {
      WAPI.getChatCreate(id, (chat) => {
        if (chat) {
          chat.sendMessage(message);
          done(true);
          return true;
        } else {
          done(false);
          return false;
        }
      });
    } else {
      // Old version of WhatsApp
      try {
        window.getContact = (id) => {
          return Store2.WapQuery.queryExist(id);
        };
        window.getContact(id).then((contact) => {
          if (contact.status === 404) {
            done(true);
          } else {
            Store2.Chat.find(contact.jid)
              .then((chat) => {
                chat.sendMessage(message);
                done(true);
                return true;
              })
              .catch((reject) => {
                if (WAPI.sendMessage(id, message)) {
                  done(true);
                  return true;
                } else {
                  done(false);
                  return false;
                }
              });
          }
        });
      } catch (e) {
        if (window.Store2.Chat.length === 0) {
          done(false);
          return false;
        }

        firstChat = Store2.Chat._models[0];
        var originalID = firstChat.id;
        firstChat.id =
          typeof originalID === "string"
            ? id
            : new window.Store2.UserConstructor(id, {
                intentionallyUsePrivateConstructor: true,
              });
        if (done !== undefined) {
          firstChat.sendMessage(message).then(function () {
            firstChat.id = originalID;
            done(true);
          });
          return true;
        } else {
          firstChat.sendMessage(message);
          firstChat.id = originalID;
          done(true);
          return true;
        }
      }
    }
  } catch (e) {
    done(false);
    return false;
  }
};

window.WAPI.sendMessageToID_old = function (id, message, done) {
  try {
    window.getContact = (id) => {
      return Store2.WapQuery.queryExist(id);
    };
    window.getContact(id).then((contact) => {
      if (contact.status === 404) {
        done(true);
      } else {
        Store2.FindChat.findChat(contact.jid)
          .then((chat) => {
            chat.sendMessage(message);
            return true;
          })
          .catch((reject) => {
            if (WAPI.sendMessage(id, message)) {
              done(true);
              return true;
            } else {
              done(false);
              return false;
            }
          });
      }
    });
  } catch (e) {
    if (window.Store2.Chat.length === 0) return false;

    firstChat = Store2.Chat._models[0];
    var originalID = firstChat.id;
    firstChat.id =
      typeof originalID === "string"
        ? id
        : new window.Store2.UserConstructor(id, {
            intentionallyUsePrivateConstructor: true,
          });
    if (done !== undefined) {
      firstChat.sendMessage(message).then(function () {
        firstChat.id = originalID;
        done(true);
      });
      return true;
    } else {
      firstChat.sendMessage(message);
      firstChat.id = originalID;
      return true;
    }
  }
  if (done !== undefined) done(false);
  return false;
};

window.WAPI.sendMessage = function (id, message, done) {
  var chat = WAPI.getChat(id);
  if (chat !== undefined) {
    if (done !== undefined) {
      chat.sendMessage(message).then(function () {
        function sleep(ms) {
          return new Promise((resolve) => setTimeout(resolve, ms));
        }

        var trials = 0;

        function check() {
          for (let i = chat.msgs._models.length - 1; i >= 0; i--) {
            let msg = chat.msgs._models[i];

            if (!msg.senderObj.isMe || msg.body != message) {
              continue;
            }
            done(WAPI._serializeMessageObj(msg));
            return True;
          }
          trials += 1;
          console.log(trials);
          if (trials > 30) {
            done(true);
            return;
          }
          sleep(500).then(check);
        }
        check();
      });
      return true;
    } else {
      chat.sendMessage(message);
      return true;
    }
  } else {
    if (done !== undefined) done(false);
    return false;
  }
};

window.WAPI.sendMessage2 = function (id, message, done) {
  var chat = WAPI.getChat(id);
  if (chat !== undefined) {
    try {
      if (done !== undefined) {
        chat.sendMessage(message).then(function () {
          done(true);
        });
      } else {
        chat.sendMessage(message);
      }
      return true;
    } catch (error) {
      if (done !== undefined) done(false);
      return false;
    }
  }
  if (done !== undefined) done(false);
  return false;
};

window.WAPI.sendSeen = function (id, done) {
  var chat = window.WAPI.getChat(id);
  if (chat !== undefined) {
    if (done !== undefined) {
      if (chat.getLastMsgKeyForAction === undefined)
        chat.getLastMsgKeyForAction = function () {};
      Store2.SendSeen(chat, false).then(function () {
        done(true);
      });
      return true;
    } else {
      Store2.SendSeen(chat, false);
      return true;
    }
  }
  if (done !== undefined) done();
  return false;
};

function isChatMessage(message) {
  if (message.isSentByMe) {
    return false;
  }
  if (message.isNotification) {
    return false;
  }
  if (!message.isUserCreatedType) {
    return false;
  }
  return true;
}

window.WAPI.getUnreadMessages = function (
  includeMe,
  includeNotifications,
  use_unread_count,
  done
) {
  const chats = window.Store2.Chat._models;
  let output = [];

  for (let chat in chats) {
    if (isNaN(chat)) {
      continue;
    }

    let messageGroupObj = chats[chat];
    let messageGroup = WAPI._serializeChatObj(messageGroupObj);

    messageGroup.messages = [];

    const messages = messageGroupObj.msgs._models;
    for (let i = messages.length - 1; i >= 0; i--) {
      let messageObj = messages[i];
      if (
        typeof messageObj.isNewMsg != "boolean" ||
        messageObj.isNewMsg === false
      ) {
        continue;
      } else {
        messageObj.isNewMsg = false;
        let message = WAPI.processMessageObj(
          messageObj,
          includeMe,
          includeNotifications
        );
        if (message) {
          messageGroup.messages.push(message);
        }
      }
    }

    if (messageGroup.messages.length > 0) {
      output.push(messageGroup);
    } else {
      // no messages with isNewMsg true
      if (use_unread_count) {
        let n = messageGroupObj.unreadCount; // will use unreadCount attribute to fetch last n messages from sender
        for (let i = messages.length - 1; i >= 0; i--) {
          let messageObj = messages[i];
          if (n > 0) {
            if (!messageObj.isSentByMe) {
              let message = WAPI.processMessageObj(
                messageObj,
                includeMe,
                includeNotifications
              );
              messageGroup.messages.unshift(message);
              n -= 1;
            }
          } else if (n === -1) {
            // chat was marked as unread so will fetch last message as unread
            if (!messageObj.isSentByMe) {
              let message = WAPI.processMessageObj(
                messageObj,
                includeMe,
                includeNotifications
              );
              messageGroup.messages.unshift(message);
              break;
            }
          } else {
            // unreadCount = 0
            break;
          }
        }
        if (messageGroup.messages.length > 0) {
          messageGroupObj.unreadCount = 0; // reset unread counter
          output.push(messageGroup);
        }
      }
    }
  }
  if (done !== undefined) {
    done(output);
  }
  return output;
};

window.WAPI.getGroupOwnerID = async function (id, done) {
  const output = (await WAPI.getGroupMetadata(id)).owner.id;
  if (done !== undefined) {
    done(output);
  }
  return output;
};

window.WAPI.getCommonGroups = async function (id, done) {
  let output = [];

  groups = window.WAPI.getAllGroups();

  for (let idx in groups) {
    try {
      participants = await window.WAPI.getGroupParticipantIDs(groups[idx].id);
      if (participants.filter((participant) => participant == id).length) {
        output.push(groups[idx]);
      }
    } catch (err) {
      console.log("Error in group:");
      console.log(groups[idx]);
      console.log(err);
    }
  }

  if (done !== undefined) {
    done(output);
  }
  return output;
};

window.WAPI.getProfilePicSmallFromId = function (id, done) {
  window.Store2.ProfilePicThumb.find(id).then(
    function (d) {
      if (d.img !== undefined) {
        window.WAPI.downloadFileWithCredentials(d.img, done);
      } else {
        done(false);
      }
    },
    function (e) {
      done(false);
    }
  );
};

window.WAPI.getProfilePicFromIdOld = function (id, done) {
  window.Store2.ProfilePicThumb.find(id).then(
    function (d) {
      if (d.imgFull !== undefined) {
        window.WAPI.downloadFileWithCredentials(d.imgFull, done);
      } else {
        done(false);
      }
    },
    function (e) {
      done(false);
    }
  );
};

window.WAPI.getProfilePicFromId = function (id, done) {
  window.Store2.ProfilePicThumb.find(id).then(
    function (d) {
      if (d.imgFull !== undefined) {
        // not working with whatsBeta
        //window.WAPI.downloadFileWithCredentials(d.imgFull, done);
        window.WAPI.downloadFile(d.imgFull, done);
      } else {
        done(false);
      }
    },
    function (e) {
      done(false);
    }
  );
};

window.WAPI.downloadFileWithCredentials = function (url, done) {
  let xhr = new XMLHttpRequest();

  xhr.onload = function () {
    if (xhr.readyState == 4) {
      if (xhr.status == 200) {
        let reader = new FileReader();
        reader.readAsDataURL(xhr.response);
        reader.onload = function (e) {
          done(reader.result.substr(reader.result.indexOf(",") + 1));
        };
      } else {
        console.error(xhr.statusText);
      }
    } else {
      console.log(err);
      done(false);
    }
  };

  xhr.open("GET", url, true);
  xhr.withCredentials = true;
  xhr.responseType = "blob";
  xhr.send(null);
};

window.WAPI.downloadFile = function (url, done) {
  let xhr = new XMLHttpRequest();

  xhr.onload = function () {
    if (xhr.readyState == 4) {
      if (xhr.status == 200) {
        let reader = new FileReader();
        reader.readAsDataURL(xhr.response);
        reader.onload = function (e) {
          done(reader.result.substr(reader.result.indexOf(",") + 1));
        };
      } else {
        console.error(xhr.statusText);
      }
    } else {
      console.log(err);
      done(false);
    }
  };

  xhr.open("GET", url, true);
  xhr.responseType = "blob";
  xhr.send(null);
};

window.WAPI.getBatteryLevel = function (done) {
  if (window.Store2.Conn.plugged) {
    if (done !== undefined) {
      done(100);
    }
    return 100;
  }
  output = window.Store2.Conn.battery;
  if (done !== undefined) {
    done(output);
  }
  return output;
};

window.WAPI.deleteConversation = function (chatId, done) {
  let userId = new window.Store2.UserConstructor(chatId, {
    intentionallyUsePrivateConstructor: true,
  });
  let conversation = WAPI.getChat(userId);

  if (!conversation) {
    if (done !== undefined) {
      done(false);
    }
    return false;
  }

  window.Store2.sendDelete(conversation, false)
    .then(() => {
      if (done !== undefined) {
        done(true);
      }
    })
    .catch(() => {
      if (done !== undefined) {
        done(false);
      }
    });

  return true;
};

window.WAPI.isBeta = function () {
  if (
    !window.localStorage.getItem("WASecretBundle") &&
    !window.localStorage.getItem("WAToken1") &&
    !window.localStorage.getItem("WAToken2")
  ) {
    return true;
  }
  return false;
};

window.WAPI.getMyChatId = () => {
  return Store2.GetMaybeMeUser.getMaybeMeUser();
};

window.WAPI.deleteMessage = function (
  chatId,
  messageArray,
  revoke = false,
  done
) {
  let userId = new window.Store2.UserConstructor(chatId, {
    intentionallyUsePrivateConstructor: true,
  });
  let conversation = WAPI.getChat(userId);

  if (!conversation) {
    if (done !== undefined) {
      done(false);
    }
    return false;
  }

  if (!Array.isArray(messageArray)) {
    messageArray = [messageArray];
  }
  let messagesToDelete = messageArray.map((msgId) =>
    window.Store2.Msg.get(msgId)
  );

  if (revoke) {
    conversation.sendRevokeMsgs(messagesToDelete, conversation);
  } else {
    //conversation.sendDeleteMsgs(messagesToDelete, conversation);
    messageArray.forEach((msgId) => {
      window.Store2.Msg.get(msgId).delete();
    });
  }

  if (done !== undefined) {
    done(true);
  }

  return true;
};

window.WAPI.checkNumberStatus = function (id, done) {
  window.WAPI.findJidFromNumber(id)
    .then((result) => {
      if (done !== undefined) {
        if (result.jid === undefined) throw 404;
        done(window.WAPI._serializeNumberStatusObj(result));
      }
    })
    .catch((e) => {
      if (done !== undefined) {
        done(
          window.WAPI._serializeNumberStatusObj({
            status: e,
            jid: id,
          })
        );
      }
    });

  return true;
};

window.WAPI.findJidFromNumber = (number) => {
  if (WAPI.isBeta()) {
    return Store2.QueryExist.queryExist(WAPI.tryFixNumber("+" + number)).then(
      (value) => {
        console.log("QueryExist: " + value.wid);
        return {
          status: 200,
          jid: value.wid,
        };
      }
    );
  } else {
    if (!number.includes("@c.us")) number += "@c.us";
    return Store2.WapQuery.queryExist(number);
  }
};

window.WAPI.tryFixNumber = (number) => {
  let firstNumbersMe = Store2.GetMaybeMeUser.getMaybeMeUser().user.substring(
    0,
    2
  );
  let firstNumbersContact = number.substring(0, 2);
  if (firstNumbersMe === firstNumbersContact) {
    return number.substring(2);
  }
  firstNumbersMe = Store2.GetMaybeMeUser.getMaybeMeUser().user.substring(0, 3);
  firstNumbersContact = number.substring(0, 3);
  if (firstNumbersMe === firstNumbersContact) {
    return number.substring(3);
  }
  console.log("tryFixNumber: " + number);
  return number;
};

/**
 * New messages observable functions.
 */
window.WAPI._newMessagesQueue = [];
window.WAPI._newMessagesBuffer =
  sessionStorage.getItem("saved_msgs") != null
    ? JSON.parse(sessionStorage.getItem("saved_msgs"))
    : [];
window.WAPI._newMessagesDebouncer = null;
window.WAPI._newMessagesCallbacks = [];

window.Store2.Msg.off("add");
sessionStorage.removeItem("saved_msgs");

window.WAPI._newMessagesListener = window.Store2.Msg.on("add", (newMessage) => {
  if (newMessage && newMessage.isNewMsg && !newMessage.isSentByMe) {
    let message = window.WAPI.processMessageObj(newMessage, false, false);
    if (message) {
      window.WAPI._newMessagesQueue.push(message);
      window.WAPI._newMessagesBuffer.push(message);
    }

    // Starts debouncer time to don't call a callback for each message if more than one message arrives
    // in the same second
    if (
      !window.WAPI._newMessagesDebouncer &&
      window.WAPI._newMessagesQueue.length > 0
    ) {
      window.WAPI._newMessagesDebouncer = setTimeout(() => {
        let queuedMessages = window.WAPI._newMessagesQueue;

        window.WAPI._newMessagesDebouncer = null;
        window.WAPI._newMessagesQueue = [];

        let removeCallbacks = [];

        window.WAPI._newMessagesCallbacks.forEach(function (callbackObj) {
          if (callbackObj.callback !== undefined) {
            callbackObj.callback(queuedMessages);
          }
          if (callbackObj.rmAfterUse === true) {
            removeCallbacks.push(callbackObj);
          }
        });

        // Remove removable callbacks.
        removeCallbacks.forEach(function (rmCallbackObj) {
          let callbackIndex =
            window.WAPI._newMessagesCallbacks.indexOf(rmCallbackObj);
          window.WAPI._newMessagesCallbacks.splice(callbackIndex, 1);
        });
      }, 1000);
    }
  }
});

window.WAPI._unloadInform = (event) => {
  // Save in the buffer the ungot unreaded messages
  window.WAPI._newMessagesBuffer.forEach((message) => {
    Object.keys(message).forEach((key) =>
      message[key] === undefined ? delete message[key] : ""
    );
  });
  sessionStorage.setItem(
    "saved_msgs",
    JSON.stringify(window.WAPI._newMessagesBuffer)
  );

  // Inform callbacks that the page will be reloaded.
  window.WAPI._newMessagesCallbacks.forEach(function (callbackObj) {
    if (callbackObj.callback !== undefined) {
      callbackObj.callback({
        status: -1,
        message: "page will be reloaded, wait and register callback again.",
      });
    }
  });
};

window.addEventListener("unload", window.WAPI._unloadInform, false);
window.addEventListener("beforeunload", window.WAPI._unloadInform, false);
window.addEventListener("pageunload", window.WAPI._unloadInform, false);

/**
 * Registers a callback to be called when a new message arrives the WAPI.
 * @param rmCallbackAfterUse - Boolean - Specify if the callback need to be executed only once
 * @param done - function - Callback function to be called when a new message arrives.
 * @returns {boolean}
 */
window.WAPI.waitNewMessages = function (rmCallbackAfterUse = true, done) {
  window.WAPI._newMessagesCallbacks.push({
    callback: done,
    rmAfterUse: rmCallbackAfterUse,
  });
  return true;
};

/**
 * Reads buffered new messages.
 * @param done - function - Callback function to be called contained the buffered messages.
 * @returns {Array}
 */
window.WAPI.getBufferedNewMessages = function (done) {
  let bufferedMessages = window.WAPI._newMessagesBuffer;
  window.WAPI._newMessagesBuffer = [];
  if (done !== undefined) {
    done(bufferedMessages);
  }
  return bufferedMessages;
};
/** End new messages observable functions **/

window.WAPI.sendImage = function (imgBase64, chatid, filename, caption, done) {
  //var idUser = new window.Store2.UserConstructor(chatid);
  var idUser = new window.Store2.UserConstructor(chatid, {
    intentionallyUsePrivateConstructor: true,
  });
  // create new chat
  return Store2.Chat.find(idUser).then((chat) => {
    var mediaBlob = window.WAPI.base64ImageToFile(imgBase64, filename);
    var mc = new Store2.MediaCollection(chat);
    mc.processAttachments([{file: mediaBlob}], 1, chat).then(() => {
      var media = mc._models[0];
      media.sendToChat(chat, {caption: caption});
      if (done !== undefined) done(true);
    });
  });
};

/** added by koji **/
window.WAPI.sendImageReply = function (
  imgBase64,
  chatid,
  idMessage,
  filename,
  caption,
  done
) {
  var messageObject = Store2.Msg.get(idMessage);
  if (messageObject === undefined) {
    if (done !== undefined) done(false);
    return false;
  }
  messageObject = messageObject.valueOf();
  //var idUser = new window.Store2.UserConstructor(chatid);
  var idUser = new window.Store2.UserConstructor(chatid, {
    intentionallyUsePrivateConstructor: true,
  });
  // create new chat
  return Store2.FindChat.findChat(idUser).then((chat) => {
    var mediaBlob = window.WAPI.base64ImageToFile(imgBase64, filename);
    var mc = new Store2.MediaCollection(chat);
    mc.processAttachments([{file: mediaBlob}, 1], chat, 1).then(() => {
      var media = mc._models[0];
      media.sendToChat(chat, {caption: caption, quotedMsg: messageObject});
      if (done !== undefined) done(true);
    });
  });
};

window.WAPI.base64ImageToFile = function (b64Data, filename) {
  var arr = b64Data.split(",");
  var mime = arr[0].match(/:(.*?);/)[1];
  var bstr = atob(arr[1]);
  var n = bstr.length;
  var u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new File([u8arr], filename, {type: mime});
};

/**
 * Send contact card to a specific chat using the chat ids
 *
 * @param {string} to '000000000000@c.us'
 * @param {string|array} contact '111111111111@c.us' | ['222222222222@c.us', '333333333333@c.us, ... 'nnnnnnnnnnnn@c.us']
 */
window.WAPI.sendContact = function (to, contact) {
  if (!Array.isArray(contact)) {
    contact = [contact];
  }
  contact = contact.map((c) => {
    return WAPI.getChat(c).__x_contact;
  });

  if (contact.length > 1) {
    window.WAPI.getChat(to).sendContactList(contact);
  } else if (contact.length === 1) {
    window.WAPI.getChat(to).sendContact(contact[0]);
  }
};

/**
 * Create an chat ID based in a cloned one
 *
 * @param {string} chatId '000000000000@c.us'
 */
window.WAPI.getNewMessageId = function (chatId) {
  var newMsgId = Store2.Msg._models[0].__x_id.clone();

  newMsgId.fromMe = true;
  newMsgId.id = WAPI.getNewId().toUpperCase();
  newMsgId.remote = chatId;
  newMsgId._serialized = `${newMsgId.fromMe}_${newMsgId.remote}_${newMsgId.id}`;

  return newMsgId;
};

/**
 * Send Customized VCard without the necessity of contact be a Whatsapp Contact
 *
 * @param {string} chatId '000000000000@c.us'
 * @param {object|array} vcard { displayName: 'Contact Name', vcard: 'BEGIN:VCARD\nVERSION:3.0\nN:;Contact Name;;;\nEND:VCARD' } | [{ displayName: 'Contact Name 1', vcard: 'BEGIN:VCARD\nVERSION:3.0\nN:;Contact Name 1;;;\nEND:VCARD' }, { displayName: 'Contact Name 2', vcard: 'BEGIN:VCARD\nVERSION:3.0\nN:;Contact Name 2;;;\nEND:VCARD' }]
 */
window.WAPI.sendVCard = function (chatId, vcard) {
  var chat = Store2.Chat.get(chatId);
  var tempMsg = Object.create(
    Store2.Msg._models.filter((msg) => msg.__x_isSentByMe)[0]
  );
  var newId = window.WAPI.getNewMessageId(chatId);

  var extend = {
    ack: 0,
    id: newId,
    local: !0,
    self: "out",
    t: parseInt(new Date().getTime() / 1000),
    to: chatId,
    isNewMsg: !0,
  };

  if (Array.isArray(vcard)) {
    Object.assign(extend, {
      type: "multi_vcard",
      vcardList: vcard,
    });

    delete extend.body;
  } else {
    Object.assign(extend, {
      type: "vcard",
      subtype: vcard.displayName,
      body: vcard.vcard,
    });

    delete extend.vcardList;
  }

  Object.assign(tempMsg, extend);

  chat.addAndSendMsg(tempMsg);
};
/**
 * Block contact
 * @param {string} id '000000000000@c.us'
 * @param {*} done - function - Callback function to be called when a new message arrives.
 */
window.WAPI.contactBlock = function (id, done) {
  const contact = window.Store2.Contact.get(id);
  if (contact !== undefined) {
    contact.setBlock(!0);
    done(true);
    return true;
  }
  done(false);
  return false;
};
/**
 * unBlock contact
 * @param {string} id '000000000000@c.us'
 * @param {*} done - function - Callback function to be called when a new message arrives.
 */
window.WAPI.contactUnblock = function (id, done) {
  const contact = window.Store2.Contact.get(id);
  if (contact !== undefined) {
    contact.setBlock(!1);
    done(true);
    return true;
  }
  done(false);
  return false;
};

/**
 * Remove participant of Group
 * @param {*} idGroup '0000000000-00000000@g.us'
 * @param {*} idParticipant '000000000000@c.us'
 * @param {*} done - function - Callback function to be called when a new message arrives.
 */
window.WAPI.removeParticipantGroup = function (idGroup, idParticipant, done) {
  window.Store2.WapQuery.removeParticipants(idGroup, [idParticipant]).then(
    () => {
      const metaDataGroup = window.Store2.GroupMetadata.get(id);
      checkParticipant = metaDataGroup.participants._index[idParticipant];
      if (checkParticipant === undefined) {
        done(true);
        return true;
      }
    }
  );
};

/**
 * Promote Participant to Admin in Group
 * @param {*} idGroup '0000000000-00000000@g.us'
 * @param {*} idParticipant '000000000000@c.us'
 * @param {*} done - function - Callback function to be called when a new message arrives.
 */
window.WAPI.promoteParticipantAdminGroup = function (
  idGroup,
  idParticipant,
  done
) {
  window.Store2.WapQuery.promoteParticipants(idGroup, [idParticipant]).then(
    () => {
      const metaDataGroup = window.Store2.GroupMetadata.get(id);
      checkParticipant = metaDataGroup.participants._index[idParticipant];
      if (checkParticipant !== undefined && checkParticipant.isAdmin) {
        done(true);
        return true;
      }
      done(false);
      return false;
    }
  );
};

/**
 * Demote Admin of Group
 * @param {*} idGroup '0000000000-00000000@g.us'
 * @param {*} idParticipant '000000000000@c.us'
 * @param {*} done - function - Callback function to be called when a new message arrives.
 */
window.WAPI.demoteParticipantAdminGroup = function (
  idGroup,
  idParticipant,
  done
) {
  window.Store2.WapQuery.demoteParticipants(idGroup, [idParticipant]).then(
    () => {
      const metaDataGroup = window.Store2.GroupMetadata.get(id);
      if (metaDataGroup === undefined) {
        done(false);
        return false;
      }
      checkParticipant = metaDataGroup.participants._index[idParticipant];
      if (checkParticipant !== undefined && checkParticipant.isAdmin) {
        done(false);
        return false;
      }
      done(true);
      return true;
    }
  );
};
window.getmsg = function () {
  var d = window.WAPI.getBufferedNewMessages();
  var t = [];
  for (let i = 0; i < d.length; i++) {
    // if (!d[i].from.user === "status") {
    var myObj = {
      to: d[i].to.user,
      from: d[i].from.user, //your artist variable
      chat: d[i].content, //your title variable
    };
    t.push(myObj);
  }
  if (t.length > 0) {
    return "chatnyamasuk" + JSON.stringify(t);
  } else {
    return "null";
  }
};
