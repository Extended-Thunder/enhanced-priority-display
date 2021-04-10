#!/usr/bin/env python3

'''
Convert .dtd translations to i18n format.

Arguments:
    "locale" directory containing folders for each language code,
        each of which contains some number of .dtd files.

    output path. Subdirectories will be created for each language
'''

import sys, os, json, re, glob, html



def load_dtd(lang, srcdir):
    translations = dict()

    for fname in glob.glob(os.path.join(srcdir, lang, '*.dtd')):
        with open(fname,'r') as dtd:
            dtdlines = [line.strip() for line in dtd.readlines() if '!ENTITY' in line]

        for line in dtdlines:
            m = re.search(r'ENTITY\s+(\S*)\s+"(.*)"', line)
            if m:
                key, value = m.groups()
                translations[key] = html.unescape(value)
            else:
                print('no match:', line)

    return translations

def get_description(lang, srcdir):
    propFile = os.path.join(srcdir, lang, 'EnhancedPriorityDisplay.properties')
    with open(propFile,'r') as properties:
        m = re.search(r'description=(.*)', properties.read())
        if m:
            return m.groups()[0].strip()
    return None


if __name__ == "__main__":
    srcdir = sys.argv[-2]
    assert os.path.isdir(srcdir)

    destdir = sys.argv[-1]
    assert not os.path.exists(destdir)

    english = dict(appName='Enhanced Priority Display')
    description = get_description('en-US', srcdir)
    if description is not None:
        english['appDesc'] = description
    english = {**english, **load_dtd('en-US', srcdir)}

    codes = [os.path.basename(dir) for dir in glob.glob(os.path.join(srcdir,'*'))]
    codes.remove('en-US')

    locales = {'en-US': dict()}
    for key, message in english.items():
        locales['en-US'][key] = dict(message=message)

    for code in codes:
        messages = dict()

        description = get_description(code, srcdir)
        if description is not None:
            messages['appDesc'] = description

        messages = {**messages, **load_dtd(code, srcdir)}

        locale = dict()
        for key, message in messages.items():
            if message == english[key]:
                pass
            else:
                locale[key] = dict(message=messages[key])

        if len(locale.keys()) > 0:
            locales[code] = locale

    for lang in locales:
        d = os.path.join(destdir,lang)
        os.makedirs(d)
        with open(os.path.join(d, 'messages.json'), 'w') as dest:
            json.dump(locales[lang], dest, indent=4)