const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '/.env') });
const fs = require('fs');
const { exec } = require("child_process");
const fetch = require('node-fetch');
const AWS = require('aws-sdk');

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

const ec2 = new AWS.EC2();

async function getCurrentValues() {
  const result = await ec2.describeSecurityGroups({
    GroupNames: [process.env.AWS_SG_NAME],
  }).promise();

  const response = [];

  result.SecurityGroups.map(securityGroup => {
    securityGroup.IpPermissions.map(ipPermission => {
      ipPermission.IpRanges.map(ipRange => {
        if (new RegExp(process.env.AWS_SG_DESCRIPTION).test(ipRange.Description)) {
          response.push({
            GroupName: process.env.AWS_SG_NAME,
            CidrIp: ipRange.CidrIp,
            IpProtocol: ipPermission.IpProtocol,
            FromPort: ipPermission.FromPort,
            ToPort: ipPermission.ToPort,
            Description: ipRange.Description,
          });
        }
      });
    });
  });

  return response;
}

async function getCurrentIp() {
  const response = await fetch('https://checkip.amazonaws.com/');
  return (await response.text()).trim();
}

async function updateIp(currentValue, newIp) {
  // remove old entry
  await ec2.revokeSecurityGroupIngress({
    GroupName: process.env.AWS_SG_NAME,
    CidrIp: currentValue.CidrIp,
    IpProtocol: currentValue.IpProtocol,
    FromPort: currentValue.FromPort,
    ToPort: currentValue.ToPort,
  }).promise();

  // create new entry
  await ec2.authorizeSecurityGroupIngress({
    GroupName: process.env.AWS_SG_NAME,
    IpPermissions: [{
      FromPort: currentValue.FromPort,
      ToPort: currentValue.ToPort,
      IpProtocol: currentValue.IpProtocol,
      IpRanges: [{
        CidrIp: `${newIp}/32`,
        Description: currentValue.Description,
      }],
    }],
  }).promise();
}

(async () => {
  const currentValues = await getCurrentValues();
  const currentIp = await getCurrentIp();

  let updated = false;
  await Promise.all(currentValues.map(async (currentValue) => {
    if (currentValue.CidrIp !== `${currentIp}/32`) {
      await updateIp(currentValue, currentIp);
      updated = true;
    }
  }));

  if (updated) {
    console.log('IP Updated');
  }
  console.log(`Current IP: ${currentIp}`);
})();
