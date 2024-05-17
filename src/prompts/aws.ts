const awsPrompts: any[] = [
  {
    message: "Select a Region: ",
    name: "aws_region",
    default: "us-east-1",
    type: "input",
  },
  {
    choices: ["eks-fargate", "eks-nodegroup", "k8s"],
    message: "Select a Cluster Type:",
    name: "cluster_type",
    type: "list",
  },
];

export default awsPrompts;
