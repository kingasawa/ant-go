import forge from "node-forge";

export function signMobileconfig(profileXml: string): Buffer {
  const certPem = (process.env.PROFILE_SIGNING_CERT ?? "").replace(/\\n/g, "\n");
  const keyPem  = (process.env.PROFILE_SIGNING_KEY  ?? "").replace(/\\n/g, "\n");

  if (!certPem || !keyPem) {
    console.warn("[profile-signing] PROFILE_SIGNING_CERT/KEY not set — serving unsigned profile (won't install on iOS 16+)");
    return Buffer.from(profileXml, "utf8");
  }

  const p7   = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(profileXml, "utf8");

  const cert = forge.pki.certificateFromPem(certPem);
  const key  = forge.pki.privateKeyFromPem(keyPem);

  p7.addCertificate(certPem);
  p7.addSigner({
    key,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() },
    ],
  });

  p7.sign();

  const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
  return Buffer.from(der, "binary");
}
