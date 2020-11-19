require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { exec } = require("child_process");
const fetch = require('node-fetch');
const AWS = require('aws-sdk');
const ec2 = new AWS.EC2();

// .env file is required
if (!fs.existsSync(path.join(__dirname, '/.env'))) {
  console.error('You must create .env file.');
  process.exit(1);
}

// config AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});
AWS.config.apiVersions = {
  ec2: '2016-11-15',
};

async function getCurrentCidrIp() {
  const result = await ec2.describeSecurityGroups({
    GroupNames: [process.env.AWS_SG_NAME],
  }).promise();

  for (const i in result.SecurityGroups) {
    const securityGroup = result.SecurityGroups[i];

    for (const j in securityGroup.IpPermissions) {
      const IpPermission = securityGroup.IpPermissions[j];

      for (const k in IpPermission.IpRanges) {
        const IpRange = IpPermission.IpRanges[k];

        if (IpRange.Description === process.env.AWS_SG_DESCRIPTION) {
          return IpRange.CidrIp;
        }
      }
    }
  }

  return null;
}

async function getCurrentIp() {
  const response = await fetch('https://v4.ifconfig.co/ip');
  return (await response.text()).trim();
}

async function updateIp(currentCidrIp, newIp) {
  // remove old entry
  await ec2.revokeSecurityGroupIngress({
    GroupName: process.env.AWS_SG_NAME,
    CidrIp: currentCidrIp,
    IpProtocol: 'tcp',
    FromPort: 0,
    ToPort: 65535,
  }).promise();

  // create new entry
  await ec2.authorizeSecurityGroupIngress({
    GroupName: process.env.AWS_SG_NAME,
    IpPermissions: [{
      FromPort: 0,
      ToPort: 65535,
      IpProtocol: 'tcp',
      IpRanges: [{
        CidrIp: `${newIp}/32`,
        Description: process.env.AWS_SG_DESCRIPTION,
      }],
    }],
  }).promise();
}

(async () => {
  const currentCidrIp = await getCurrentCidrIp();
  const currentIp = await getCurrentIp();

  if (true || currentCidrIp !== `${currentIp}/32`) {
    await updateIp(currentCidrIp, currentIp);
    console.log('IP Updated');
  }
  console.log(`Current IP: ${currentIp}`);
})();
