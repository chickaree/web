
function wrapObject(object, activityType = 'Create') {
  const { type } = object;

  switch (type) {
    case 'OrderedCollection':
      return {
        type: activityType,
        object: {
          ...object,
          orderedItems: (object.orderedItems || []).map((item) => wrapObject(item)),
        },
      };
    default:
      return {
        type: activityType,
        object,
      };
  }
}

export default wrapObject;
