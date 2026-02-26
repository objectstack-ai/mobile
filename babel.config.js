module.exports = function (api) {
  api.cache(true);

  const isTest = process.env.NODE_ENV === "test";

  return {
    presets: [
      [
        "babel-preset-expo",
        isTest
          ? {}
          : {
              jsxImportSource: "nativewind",
              unstable_transformImportMeta: true,
            },
      ],
      ...(isTest ? [] : ["nativewind/babel"]),
    ],
  };
};
