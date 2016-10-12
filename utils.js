module.exports = {

    replaceEexTagswithBrackets: function (text) {
        return text.replace(/<%=/g, '{').replace(/%>/g, '}');
    },

    replaceBracketsWithEexTags: function (text) {
        return text.replace(/{/g, '<%=').replace(/}/g, '%>');
    },

    wrapEexTagsinHtmlComments: function (text) {
        return text.replace(/<%=(.*?)%>/g, function (match, p1) {
            return `<!-- ${match} -->`;
        });
    },

    unwrapEexTagsinHtmlComments: function (text) {
        return text.replace(/<!-- <%=(.*?)%> -->/g, function (match, p1) {
            return `<%=${p1}%>`;
        });
    },

    wrapEexTagsInRawTags: function (text) {
        return text.replace(/<%=(.*?)%>/g, function (match, p1) {
            return `<raw>${match}</raw>`;
        });
    },

    unwrapEexTagsinRawTags: function (text) {
        return text.replace(/<raw>(.*?)<\/raw>/g, function (match, p1) {
            return `${p1}`;
        });
    }

};