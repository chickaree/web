// eslint-disable-next-line import/no-extraneous-dependencies
import data from 'schemaorg/data/releases/7.03/schema.jsonld';
import toArray from '../utils/to-array';

function getTree(uri) {
  return data['@graph'].reduce((acc, item) => {
    if (item['@id'] === uri) {
      return [
        ...acc,
        item['@id'],
      ];
    }

    if (item['rdfs:subClassOf']) {
      const child = toArray(item['rdfs:subClassOf'] || []).find((i) => i['@id'] === uri);
      if (child) {
        return [
          ...acc,
          ...getTree(item['@id']),
        ];
      }
    }

    return acc;
  }, []);
}

const start = 'http://schema.org/'.length;

function trimList(list = []) {
  return list.map((item) => item.substring(start));
}

export const Article = trimList(getTree('http://schema.org/Article'));
export const WebPage = trimList(getTree('http://schema.org/WebPage'));
export const ItemList = trimList(getTree('http://schema.org/ItemList'));
export const Person = trimList(getTree('http://schema.org/Person'));
export const Organization = trimList(getTree('http://schema.org/Organization'));
